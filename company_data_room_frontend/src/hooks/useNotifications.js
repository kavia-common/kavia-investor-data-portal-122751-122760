import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

/**
 * Helpers and constants
 */
const DEFAULT_TABLE = 'notifications';

function isTableMissingError(error) {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  return msg.includes('does not exist') || (msg.includes('relation') && msg.includes('does not exist'));
}

function toNotificationModel(r) {
  if (!r || typeof r !== 'object') return null;
  return {
    id: r.id ?? null,
    targetUserId: r.target_user_id ?? null,
    targetEmail: r.target_email ?? null,
    targetRoles: Array.isArray(r.target_roles) ? r.target_roles : null,
    type: r.type ?? 'generic',
    title: r.title ?? '',
    body: r.body ?? '',
    status: r.status ?? 'unread',
    readAt: r.read_at ?? null,
    createdAt: r.created_at ?? r.inserted_at ?? null,
    metadata: r.metadata ?? null,
    actorUserId: r.actor_user_id ?? null,
    requestId: r.request_id ?? null,
    raw: r,
  };
}

/**
 * Check if a notification record should be visible for the current user based on audience targeting.
 */
function matchesAudience(notif, user, roles = []) {
  if (!notif) return false;
  const uid = user?.id || null;
  const email = user?.email || null;

  // Direct targeting
  if (uid && notif.targetUserId && String(notif.targetUserId) === String(uid)) return true;
  if (email && notif.targetEmail && String(notif.targetEmail).toLowerCase() === String(email).toLowerCase()) return true;

  // Role targeting
  if (Array.isArray(notif.targetRoles) && notif.targetRoles.length > 0 && Array.isArray(roles) && roles.length > 0) {
    const lowerRoles = roles.map((r) => String(r).toLowerCase());
    return notif.targetRoles.some((r) => lowerRoles.includes(String(r).toLowerCase()));
  }

  return false;
}

/**
 * PUBLIC_INTERFACE
 * useNotifications
 *
 * A React hook to manage user and role-targeted notifications stored in Supabase.
 *
 * Features:
 * - Fetch notifications targeted to the current user (by user_id/email) and/or their roles.
 * - Mark single notification as read, or mark all visible notifications as read.
 * - Insert notifications (used by app logic like request approvals/denials).
 * - Realtime updates via Supabase channels to reflect new/updated notifications immediately.
 *
 * Table expected (public.notifications):
 * - id uuid primary key default gen_random_uuid()
 * - target_user_id uuid null references auth.users(id)
 * - target_email text null
 * - target_roles text[] null               -- any role in this array matches audience
 * - type text not null                     -- e.g., 'access_request', 'request_status'
 * - title text not null
 * - body text not null
 * - status text default 'unread' check in ('unread', 'read')
 * - read_at timestamptz null
 * - actor_user_id uuid null references auth.users(id)
 * - request_id uuid null                   -- related access request if applicable
 * - metadata jsonb null
 * - created_at timestamptz default now()
 * - updated_at timestamptz default now()
 *
 * Returns:
 * {
 *   items,                 // Notification[] (already audience-filtered)
 *   unreadCount,           // number
 *   loading, error,        // flags
 *   refresh,               // () => Promise<void>
 *   markRead,              // (id: string) => Promise<{ error }>
 *   markAllRead,           // () => Promise<{ error }>
 *   addNotification,       // (payload) => Promise<{ data, error }>
 * }
 */
export default function useNotifications() {
  const { user, roleClaims } = useAuth();
  const roles = useMemo(() => Array.isArray(roleClaims?.roles) ? roleClaims.roles : [], [roleClaims?.roles]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Derived: unread count
  const unreadCount = useMemo(() => items.filter((n) => String(n.status).toLowerCase() === 'unread').length, [items]);

  /**
   * PUBLIC_INTERFACE
   * refresh
   *
   * Loads recent notifications and filters them for the current audience.
   * To keep it simple and robust against RLS setups, we fetch a limited set and filter client-side.
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!supabase) {
        const softError = new Error('Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.');
        if (mountedRef.current) setError(softError);
        return;
      }
      // Fetch recent rows; if RLS restricts, only allowed rows will be returned.
      const { data, error: qError } = await supabase
        .from(DEFAULT_TABLE)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (qError) {
        if (mountedRef.current) setError(qError);
        return;
      }
      const mapped = (Array.isArray(data) ? data : []).map(toNotificationModel).filter(Boolean);
      const filtered = mapped.filter((n) => matchesAudience(n, user, roles));
      if (mountedRef.current) setItems(filtered);
    } catch (e) {
      if (mountedRef.current) setError(e);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user, roles]);

  /**
   * PUBLIC_INTERFACE
   * markRead
   *
   * Marks a single notification as read.
   */
  const markRead = useCallback(async (id) => {
    if (!id) return { error: new Error('Notification id is required') };
    try {
      if (!supabase) {
        return { error: new Error('Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.') };
      }
      const now = new Date().toISOString();
      const { error } = await supabase.from(DEFAULT_TABLE).update({ status: 'read', read_at: now }).eq('id', id);
      if (error) return { error };
      // Optimistic local update
      if (mountedRef.current) {
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, status: 'read', readAt: now } : n)));
      }
      return { error: null };
    } catch (e) {
      return { error: e };
    }
  }, []);

  /**
   * PUBLIC_INTERFACE
   * markAllRead
   *
   * Marks all currently visible notifications as read.
   * Uses a simple per-id update to avoid complex policy issues server-side.
   */
  const markAllRead = useCallback(async () => {
    const unread = items.filter((n) => String(n.status).toLowerCase() === 'unread');
    if (unread.length === 0) return { error: null };
    const ids = unread.map((n) => n.id).filter(Boolean);
    try {
      if (!supabase) {
        return { error: new Error('Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.') };
      }
      const now = new Date().toISOString();
      // Batch updates; to keep it simple, updating in parallel
      await Promise.all(
        ids.map((id) => supabase.from(DEFAULT_TABLE).update({ status: 'read', read_at: now }).eq('id', id))
      );
      if (mountedRef.current) {
        setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, status: 'read', readAt: now } : n)));
      }
      return { error: null };
    } catch (e) {
      return { error: e };
    }
  }, [items]);

  /**
   * PUBLIC_INTERFACE
   * addNotification
   *
   * Inserts a new notification.
   * payload: {
   *  targetUserId?, targetEmail?, targetRoles?: string[],
   *  type: string, title: string, body: string,
   *  metadata?: any, requestId?: string
   * }
   */
  const addNotification = useCallback(
    async (payload = {}) => {
      try {
        if (!supabase) {
          return { data: null, error: new Error('Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.') };
        }
        const insertPayload = {
          target_user_id: payload.targetUserId || null,
          target_email: payload.targetEmail || null,
          target_roles: Array.isArray(payload.targetRoles) ? payload.targetRoles : null,
          type: payload.type || 'generic',
          title: payload.title || '',
          body: payload.body || '',
          status: 'unread',
          metadata: payload.metadata || null,
          actor_user_id: user?.id || null,
          request_id: payload.requestId || null,
        };
        const { data, error } = await supabase.from(DEFAULT_TABLE).insert(insertPayload).select('*').single();
        if (error) return { data: null, error };
        const model = toNotificationModel(data);
        // If targeted to self, append optimistically
        if (mountedRef.current && matchesAudience(model, user, roles)) {
          setItems((prev) => [model, ...prev]);
        }
        return { data: model, error: null };
      } catch (e) {
        return { data: null, error: e };
      }
    },
    [user, roles]
  );

  // Initial load
  useEffect(() => {
    if (!user && !roles?.length) {
      // Clear on logout
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }
    refresh();
  }, [user?.id, (roles || []).join('|'), refresh]);

  // Realtime subscription
  useEffect(() => {
    if (!supabase) return undefined;
    const channel = supabase
      .channel('realtime:notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: DEFAULT_TABLE },
        (payload) => {
          const row = payload?.new || payload?.old || null;
          const model = toNotificationModel(row);
          if (!model) return;
          // Only update if this item is relevant to audience
          if (!matchesAudience(model, user, roles)) return;

          setItems((prev) => {
            const idx = prev.findIndex((n) => n.id === model.id);
            if (payload.eventType === 'DELETE') {
              if (idx >= 0) {
                const clone = prev.slice();
                clone.splice(idx, 1);
                return clone;
              }
              return prev;
            }
            if (idx >= 0) {
              const clone = prev.slice();
              clone[idx] = model;
              return clone;
            }
            return [model, ...prev];
          });
        }
      )
      .subscribe((status) => {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.debug('[notifications] realtime status:', status);
        }
      });

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [user?.id, (roles || []).join('|')]);

  return {
    items,
    unreadCount,
    loading,
    error,
    // PUBLIC_INTERFACE
    refresh,
    // PUBLIC_INTERFACE
    markRead,
    // PUBLIC_INTERFACE
    markAllRead,
    // PUBLIC_INTERFACE
    addNotification,
  };
}
