import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

/**
 * Helpers and constants
 */

// Table names (best-effort; if missing, the hook degrades gracefully)
const TABLE_VIEWS = 'document_views';
const TABLE_REQUESTS = 'access_requests';
const TABLE_NOTIFICATIONS = 'notifications';

const VALID_TIERS = ['public', 'qualified', 'nda'];

function normalizeTier(tier) {
  if (!tier) return null;
  const t = String(tier).toLowerCase();
  return VALID_TIERS.includes(t) ? t : null;
}

function isTableMissingError(error) {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  return msg.includes('does not exist') || (msg.includes('relation') && msg.includes('does not exist'));
}

function toActivityModel(r) {
  if (!r || typeof r !== 'object') return null;
  const md = r.metadata || {};
  return {
    id: r.id ?? null,
    type: r.type ?? 'generic',
    title: r.title ?? '',
    body: r.body ?? '',
    createdAt: r.created_at ?? r.inserted_at ?? null,
    status: md.status ?? null,
    tier: md.tier ?? null,
    actorUserId: r.actor_user_id ?? null,
    targetUserId: r.target_user_id ?? null,
    targetEmail: r.target_email ?? null,
    raw: r,
  };
}

function toViewModel(r) {
  if (!r || typeof r !== 'object') return null;
  // Accept multiple possible column names for robustness
  const userId = r.user_id ?? r.viewer_user_id ?? r.viewerId ?? null;
  const email = r.email ?? r.viewer_email ?? r.viewerEmail ?? null;
  return {
    id: r.id ?? null,
    path: r.path ?? r.document_path ?? null,
    tier: r.tier ?? null,
    userId,
    email,
    createdAt: r.created_at ?? r.viewed_at ?? null,
    raw: r,
  };
}

function startOfRange(daysBack = 30) {
  const d = new Date();
  d.setDate(d.getDate() - Number(daysBack || 30));
  return d.toISOString();
}

/**
 * Compute aggregate metrics from view records.
 */
function aggregateViews(viewRows = []) {
  const byTier = { public: 0, qualified: 0, nda: 0 };
  const uniqueViewerSet = new Set();
  const byDoc = new Map();

  for (const r of viewRows) {
    const tier = normalizeTier(r.tier) || 'public';
    byTier[tier] = (byTier[tier] || 0) + 1;

    const viewerKey =
      (r.userId && `uid:${String(r.userId)}`) ||
      (r.email && `em:${String(r.email).toLowerCase()}`) ||
      null;
    if (viewerKey) uniqueViewerSet.add(viewerKey);

    const path = r.path || 'unknown';
    const curr = byDoc.get(path) || {
      path,
      tier,
      views: 0,
      uniqueViewers: new Set(),
      lastViewedAt: null,
    };
    curr.views += 1;
    if (viewerKey) curr.uniqueViewers.add(viewerKey);
    const ts = r.createdAt ? new Date(r.createdAt).getTime() : 0;
    const currTs = curr.lastViewedAt ? new Date(curr.lastViewedAt).getTime() : 0;
    if (ts > currTs) curr.lastViewedAt = r.createdAt || curr.lastViewedAt;
    byDoc.set(path, curr);
  }

  const topDocuments = Array.from(byDoc.values())
    .map((d) => ({
      path: d.path,
      tier: d.tier,
      views: d.views,
      unique_viewers: d.uniqueViewers.size,
      last_viewed_at: d.lastViewedAt,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  return {
    totalViews: viewRows.length,
    byTier,
    uniqueViewers: uniqueViewerSet.size,
    topDocuments,
  };
}

/**
 * Aggregate activity items (e.g., notifications) by type and tier for quick stats.
 */
function aggregateActivity(activityItems = []) {
  const byType = {};
  const byTier = { public: 0, qualified: 0, nda: 0 };

  for (const item of activityItems) {
    const t = String(item.type || 'generic').toLowerCase();
    byType[t] = (byType[t] || 0) + 1;
    const tier = normalizeTier(item.tier);
    if (tier) byTier[tier] = (byTier[tier] || 0) + 1;
  }

  return {
    byType,
    byTier,
    total: activityItems.length,
  };
}

/**
 * PUBLIC_INTERFACE
 * useAnalytics
 *
 * Provides aggregated analytics for dashboards:
 * - Document view counts and unique viewers
 * - Pending access requests count (founder/admin: global; investor: own pending)
 * - Recent activity aggregation from notifications (or activity log table if RLS allows)
 *
 * Data sources (best-effort):
 * - public.document_views (optional): { id, path, tier, user_id?, email?, created_at }
 * - public.access_requests: used to compute pending counts
 * - public.notifications: used for recent activity (types: 'access_request', 'request_status', etc.)
 *
 * Behavior:
 * - If Supabase is not configured or tables are missing/RLS-protected, the hook avoids crashing and returns zeros.
 * - Founders/Admins see global aggregates (subject to RLS). Others see limited (e.g., their own pending requests).
 *
 * Env:
 * - REACT_APP_SUPABASE_URL
 * - REACT_APP_SUPABASE_KEY
 *
 * Returns:
 * {
 *   loading: boolean,
 *   error: Error | null,
 *   // Aggregates
 *   views: {
 *     totalViews: number,
 *     uniqueViewers: number,
 *     byTier: { public: number, qualified: number, nda: number },
 *     topDocuments: Array<{ path, tier, views, unique_viewers, last_viewed_at }>
 *   },
 *   requests: {
 *     pending: number,
 *   },
 *   activity: {
 *     items: Array<Activity>,
 *     summary: {
 *       byType: Record<string, number>,
 *       byTier: { public: number, qualified: number, nda: number },
 *       total: number,
 *     }
 *   },
 *   // PUBLIC_INTERFACE
 *   refresh: () => Promise<void>,
 * }
 */
export default function useAnalytics(options = {}) {
  const { user, hasAnyRole } = useAuth();
  const canManage = useMemo(() => Boolean(hasAnyRole?.(['founder', 'admin'])), [hasAnyRole]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [viewsAgg, setViewsAgg] = useState({
    totalViews: 0,
    uniqueViewers: 0,
    byTier: { public: 0, qualified: 0, nda: 0 },
    topDocuments: [],
  });
  // Keep recent raw view rows for \"Recent Viewers\" UI
  const [viewsRaw, setViewsRaw] = useState([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [activityItems, setActivityItems] = useState([]);
  const [activitySummary, setActivitySummary] = useState({
    byType: {},
    byTier: { public: 0, qualified: 0, nda: 0 },
    total: 0,
  });

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const timeRangeDays = Number(options.timeRangeDays || 30);
  const sinceIso = useMemo(() => startOfRange(timeRangeDays), [timeRangeDays]);

  // PUBLIC_INTERFACE
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!supabase) {
        const softError = new Error(
          'Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.'
        );
        if (mountedRef.current) {
          setError(softError);
          // Provide empty aggregates to keep UI stable
          setViewsAgg((v) => ({
            ...v,
            totalViews: 0,
            uniqueViewers: 0,
            byTier: { public: 0, qualified: 0, nda: 0 },
            topDocuments: [],
          }));
          setViewsRaw([]);
          setPendingRequests(0);
          setActivityItems([]);
          setActivitySummary({ byType: {}, byTier: { public: 0, qualified: 0, nda: 0 }, total: 0 });
        }
        return;
      }

      // Fetch in parallel, best-effort
      const tasks = {
        views: (async () => {
          try {
            const { data, error: err } = await supabase
              .from(TABLE_VIEWS)
              .select('*')
              .gte('created_at', sinceIso)
              .order('created_at', { ascending: false })
              .limit(1000);
            if (err) {
              if (!isTableMissingError(err)) {
                if (process.env.NODE_ENV !== 'production') {
                  // eslint-disable-next-line no-console
                  console.warn('[useAnalytics] document_views error:', err.message);
                }
              }
              return [];
            }
            return (Array.isArray(data) ? data : []).map(toViewModel).filter(Boolean);
          } catch (e) {
            if (process.env.NODE_ENV !== 'production') {
              // eslint-disable-next-line no-console
              console.warn('[useAnalytics] document_views threw:', e);
            }
            return [];
          }
        })(),
        requests: (async () => {
          try {
            // Founders/Admins: global pending count; others: pending for self
            let q = supabase.from(TABLE_REQUESTS).select('*', { count: 'exact', head: true }).eq('status', 'pending');
            if (!canManage && user?.id) {
              q = q.eq('user_id', user.id);
            }
            const { count, error: err } = await q;
            if (err) {
              if (!isTableMissingError(err)) {
                if (process.env.NODE_ENV !== 'production') {
                  // eslint-disable-next-line no-console
                  console.warn('[useAnalytics] access_requests error:', err.message);
                }
              }
              return 0;
            }
            return typeof count === 'number' ? count : 0;
          } catch (e) {
            return 0;
          }
        })(),
        activity: (async () => {
          try {
            // Fetch recent notifications; RLS may limit visibility.
            const { data, error: err } = await supabase
              .from(TABLE_NOTIFICATIONS)
              .select('*')
              .order('created_at', { ascending: false })
              .limit(200);
            if (err) {
              if (!isTableMissingError(err)) {
                if (process.env.NODE_ENV !== 'production') {
                  // eslint-disable-next-line no-console
                  console.warn('[useAnalytics] notifications error:', err.message);
                }
              }
              return [];
            }
            return (Array.isArray(data) ? data : []).map(toActivityModel).filter(Boolean);
          } catch (e) {
            return [];
          }
        })(),
      };

      const [viewRows, pendingCount, activityRows] = await Promise.all([
        tasks.views,
        tasks.requests,
        tasks.activity,
      ]);

      // Compute aggregates
      const vAgg = aggregateViews(viewRows);
      const aSummary = aggregateActivity(activityRows);

      if (mountedRef.current) {
        setViewsAgg(vAgg);
        setViewsRaw(Array.isArray(viewRows) ? viewRows : []);
        setPendingRequests(pendingCount);
        setActivityItems(activityRows);
        setActivitySummary(aSummary);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [user?.id, canManage, sinceIso]);

  // Initial load and on role/user change
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    loading,
    error,
    // Aggregates
    views: viewsAgg,
    requests: { pending: pendingRequests },
    activity: { items: activityItems, summary: activitySummary },
    // Recent raw view rows for \"Recent Viewers\" UI
    recentViews: viewsRaw.slice(0, 12),
    // PUBLIC_INTERFACE
    refresh,
  };
}
