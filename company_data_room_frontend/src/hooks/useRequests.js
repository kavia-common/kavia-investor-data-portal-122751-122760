import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

/**
 * Internal constants and utilities
 */
const DEFAULT_TABLE = 'access_requests';
const VALID_TIERS = ['public', 'qualified', 'nda'];
const VALID_STATUS = ['pending', 'approved', 'denied', 'revoked', 'withdrawn'];

/**
 * Normalize tier into the accepted values.
 * @param {string} tier
 * @returns {'public'|'qualified'|'nda'|null}
 */
function normalizeTier(tier) {
  if (!tier) return null;
  const t = String(tier).toLowerCase();
  return VALID_TIERS.includes(t) ? t : null;
}

/**
 * Normalize status into accepted values.
 * @param {string} status
 * @returns {'pending'|'approved'|'denied'|'revoked'|'withdrawn'|null}
 */
function normalizeStatus(status) {
  if (!status) return null;
  const s = String(status).toLowerCase();
  return VALID_STATUS.includes(s) ? s : null;
}

/**
 * Try to detect if a "relation does not exist" error occurred.
 */
function isTableMissingError(error) {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  return msg.includes('does not exist') || (msg.includes('relation') && msg.includes('does not exist'));
}

/**
 * Map raw DB record into a friendly request model.
 */
function toRequestModel(r) {
  if (!r || typeof r !== 'object') return null;
  return {
    id: r.id ?? null,
    userId: r.user_id ?? r.userId ?? null,
    email: r.email ?? null,
    tier: r.tier ?? null,
    organization: r.organization ?? null,
    notes: r.notes ?? null,
    qualified: Boolean(r.qualified),
    status: r.status ?? 'pending',
    reason: r.reason ?? null, // reason for approval/denial/revocation if provided
    reviewedBy: r.reviewed_by ?? null,
    reviewedAt: r.reviewed_at ?? null,
    createdAt: r.created_at ?? r.inserted_at ?? null,
    updatedAt: r.updated_at ?? null,
    raw: r,
  };
}

/**
 * Helper: build a safe filter query on the access_requests table.
 */
function applyAdminFilters(query, { status, tier, email, search, limit } = {}) {
  let q = query;
  if (status) {
    const s = normalizeStatus(status);
    if (s) q = q.eq('status', s);
  }
  if (tier) {
    const t = normalizeTier(tier);
    if (t) q = q.eq('tier', t);
  }
  if (email) {
    q = q.ilike('email', `%${email}%`);
  }
  if (search) {
    // apply search to multiple fields best-effort
    q = q.or(
      [
        `email.ilike.%${search}%`,
        `organization.ilike.%${search}%`,
        `notes.ilike.%${search}%`,
        `reason.ilike.%${search}%`,
      ].join(',')
    );
  }
  if (typeof limit === 'number' && limit > 0) {
    q = q.limit(Math.min(limit, 1000));
  }
  return q;
}

/**
 * Hook state defaults
 */
const initialState = Object.freeze({
  myRequests: [],
  allRequests: [],
  loadingMine: false,
  loadingAll: false,
  submitting: false,
  actionBusy: false,
  errorMine: null,
  errorAll: null,
  errorSubmit: null,
  errorAction: null,
});

/**
 * PUBLIC_INTERFACE
 * useRequests
 *
 * A React hook to manage Access Requests workflow via Supabase.
 *
 * Supports:
 * - Investors: submit a request to access a tier; track their own requests.
 * - Founders/Admins: view all requests; filter; approve/deny/revoke with optional reason.
 * - Role-based visibility (investors see only their requests; founders/admins see/manage all).
 * - Loading and error states per operation.
 *
 * Table expected (public.access_requests):
 * - id uuid primary key default gen_random_uuid()
 * - user_id uuid not null references auth.users(id)
 * - email text
 * - tier text check in ('public','qualified','nda') not null
 * - organization text
 * - notes text
 * - qualified boolean default false
 * - status text default 'pending' check in ('pending','approved','denied','revoked','withdrawn')
 * - reason text null
 * - reviewed_by uuid null references auth.users(id)
 * - reviewed_at timestamptz null
 * - created_at timestamptz default now()
 * - updated_at timestamptz default now()
 *
 * Returns:
 * {
 *   // Data
 *   myRequests,           // Request[] — current user's requests (investor)
 *   allRequests,          // Request[] — all requests (founder/admin)
 *   visibleRequests,      // Request[] — auto-resolved list based on role
 *
 *   // Capabilities
 *   canSubmit,            // boolean — investors can submit
 *   canManage,            // boolean — founders/admins can manage
 *
 *   // Loading & errors
 *   loadingMine, loadingAll, submitting, actionBusy,
 *   errorMine, errorAll, errorSubmit, errorAction,
 *
 *   // Operations
 *   refreshMine,          // () => Promise<void>
 *   refreshAll,           // (filters?: {status?, tier?, email?, search?, limit?}) => Promise<void>
 *   submitRequest,        // (payload: { tier, organization?, notes?, qualified? }) => Promise<{ data, error }>
 *   approveRequest,       // (id: string, opts?: { reason?: string }) => Promise<{ error }>
 *   denyRequest,          // (id: string, opts?: { reason?: string }) => Promise<{ error }>
 *   revokeRequest,        // (id: string, opts?: { reason?: string }) => Promise<{ error }>
 *   withdrawRequest,      // (id: string, opts?: { reason?: string }) => Promise<{ error }>
 *   updateRequestStatus,  // (id: string, status: string, opts?: { reason?: string }) => Promise<{ error }>
 * }
 */
export default function useRequests() {
  const { user, hasRole, hasAnyRole } = useAuth();
  const [state, setState] = useState(initialState);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Role capabilities
  const canManage = useMemo(() => Boolean(hasAnyRole?.(['founder', 'admin'])), [hasAnyRole]);
  const canSubmit = useMemo(() => Boolean(hasRole?.('investor')), [hasRole]);

  const userId = user?.id ?? null;

  /**
   * PUBLIC_INTERFACE
   * refreshMine
   *
   * Loads the current user's requests (investor view).
   * No-op if not authenticated or Supabase not configured.
   */
  const refreshMine = useCallback(async () => {
    setState((s) => ({ ...s, loadingMine: true, errorMine: null }));
    try {
      if (!supabase) {
        const softError = new Error(
          'Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.'
        );
        if (mountedRef.current) {
          setState((s) => ({ ...s, myRequests: [], errorMine: softError }));
        }
        return;
      }
      if (!userId) {
        if (mountedRef.current) {
          setState((s) => ({ ...s, myRequests: [] }));
        }
        return;
      }
      const { data, error } = await supabase
        .from(DEFAULT_TABLE)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) {
        if (mountedRef.current) setState((s) => ({ ...s, errorMine: error }));
        return;
      }
      const list = Array.isArray(data) ? data.map(toRequestModel).filter(Boolean) : [];
      if (mountedRef.current) {
        setState((s) => ({ ...s, myRequests: list }));
      }
    } catch (e) {
      if (mountedRef.current) setState((s) => ({ ...s, errorMine: e }));
    } finally {
      if (mountedRef.current) setState((s) => ({ ...s, loadingMine: false }));
    }
  }, [userId]);

  /**
   * PUBLIC_INTERFACE
   * refreshAll
   *
   * Loads all requests for founders/admins with optional filters.
   * Filters: { status, tier, email, search, limit }
   */
  const refreshAll = useCallback(
    async (filters = {}) => {
      setState((s) => ({ ...s, loadingAll: true, errorAll: null }));
      try {
        if (!supabase) {
          const softError = new Error(
            'Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.'
          );
          if (mountedRef.current) {
            setState((s) => ({ ...s, allRequests: [], errorAll: softError }));
          }
          return;
        }
        if (!canManage) {
          if (mountedRef.current) {
            setState((s) => ({ ...s, allRequests: [] }));
          }
          return;
        }
        let q = supabase.from(DEFAULT_TABLE).select('*');
        q = applyAdminFilters(q, filters);
        q = q.order('created_at', { ascending: false });

        const { data, error } = await q;
        if (error) {
          if (mountedRef.current) setState((s) => ({ ...s, errorAll: error }));
          return;
        }
        const list = Array.isArray(data) ? data.map(toRequestModel).filter(Boolean) : [];
        if (mountedRef.current) setState((s) => ({ ...s, allRequests: list }));
      } catch (e) {
        if (mountedRef.current) setState((s) => ({ ...s, errorAll: e }));
      } finally {
        if (mountedRef.current) setState((s) => ({ ...s, loadingAll: false }));
      }
    },
    [canManage]
  );

  /**
   * PUBLIC_INTERFACE
   * submitRequest
   *
   * Investors submit a request to access a target tier.
   * @param {{ tier: string, organization?: string, notes?: string, qualified?: boolean }} payload
   * @returns {Promise<{ data: any, error: Error | null }>}
   */
  const submitRequest = useCallback(
    async (payload = {}) => {
      setState((s) => ({ ...s, submitting: true, errorSubmit: null }));
      try {
        if (!supabase) {
          const error = new Error(
            'Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.'
          );
          if (mountedRef.current) setState((s) => ({ ...s, errorSubmit: error }));
          return { data: null, error };
        }
        if (!userId || !user?.email) {
          const error = new Error('You must be signed in to submit a request.');
          if (mountedRef.current) setState((s) => ({ ...s, errorSubmit: error }));
          return { data: null, error };
        }
        if (!canSubmit) {
          const error = new Error('You do not have permission to submit access requests.');
          if (mountedRef.current) setState((s) => ({ ...s, errorSubmit: error }));
          return { data: null, error };
        }

        const targetTier = normalizeTier(payload.tier);
        if (!targetTier) {
          const error = new Error('A valid target tier is required: public, qualified, or nda.');
          if (mountedRef.current) setState((s) => ({ ...s, errorSubmit: error }));
          return { data: null, error };
        }

        const insertPayload = {
          user_id: userId,
          email: user.email,
          tier: targetTier,
          organization: payload.organization || null,
          notes: payload.notes || null,
          qualified: Boolean(payload.qualified),
          status: 'pending',
          reason: null,
        };

        const { data, error } = await supabase.from(DEFAULT_TABLE).insert(insertPayload).select('*').single();
        if (error) {
          if (mountedRef.current) setState((s) => ({ ...s, errorSubmit: error }));
          return { data: null, error };
        }

        // Refresh my list after submission
        await refreshMine();

        return { data, error: null };
      } catch (e) {
        if (mountedRef.current) setState((s) => ({ ...s, errorSubmit: e }));
        return { data: null, error: e };
      } finally {
        if (mountedRef.current) setState((s) => ({ ...s, submitting: false }));
      }
    },
    [userId, user?.email, canSubmit, refreshMine]
  );

  /**
   * PUBLIC_INTERFACE
   * updateRequestStatus
   *
   * Generic status updater for founders/admins (and controlled investor actions like withdraw).
   * @param {string} id
   * @param {'pending'|'approved'|'denied'|'revoked'|'withdrawn'} nextStatus
   * @param {{ reason?: string }} [opts]
   * @returns {Promise<{ error: Error | null }>}
   */
  const updateRequestStatus = useCallback(
    async (id, nextStatus, opts = {}) => {
      setState((s) => ({ ...s, actionBusy: true, errorAction: null }));
      try {
        if (!supabase) {
          return {
            error: new Error(
              'Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.'
            ),
          };
        }
        const status = normalizeStatus(nextStatus);
        if (!id || !status) {
          return { error: new Error('A valid request id and status are required.') };
        }

        const now = new Date().toISOString();
        const isManagedAction = ['approved', 'denied', 'revoked'].includes(status);

        const patch = {
          status,
          reason: opts?.reason ?? null,
          updated_at: now,
        };

        if (isManagedAction) {
          if (!canManage) {
            return { error: new Error('You do not have permission to update request status.') };
          }
          patch.reviewed_by = userId ?? null;
          patch.reviewed_at = now;
        }

        const { error } = await supabase.from(DEFAULT_TABLE).update(patch).eq('id', id);
        if (error) {
          if (mountedRef.current) setState((s) => ({ ...s, errorAction: error }));
          return { error };
        }

        // Refresh appropriate lists
        if (canManage) {
          await refreshAll();
        }
        await refreshMine();

        return { error: null };
      } catch (e) {
        if (mountedRef.current) setState((s) => ({ ...s, errorAction: e }));
        return { error: e };
      } finally {
        if (mountedRef.current) setState((s) => ({ ...s, actionBusy: false }));
      }
    },
    [canManage, userId, refreshAll, refreshMine]
  );

  /**
   * PUBLIC_INTERFACE
   * approveRequest
   *
   * Mark a request as approved with an optional reason (founder/admin only).
   * @param {string} id
   * @param {{ reason?: string }} [opts]
   */
  const approveRequest = useCallback(
    async (id, opts = {}) => updateRequestStatus(id, 'approved', opts),
    [updateRequestStatus]
  );

  /**
   * PUBLIC_INTERFACE
   * denyRequest
   *
   * Mark a request as denied with an optional reason (founder/admin only).
   * @param {string} id
   * @param {{ reason?: string }} [opts]
   */
  const denyRequest = useCallback(
    async (id, opts = {}) => updateRequestStatus(id, 'denied', opts),
    [updateRequestStatus]
  );

  /**
   * PUBLIC_INTERFACE
   * revokeRequest
   *
   * Mark an approved request as revoked (founder/admin only).
   * @param {string} id
   * @param {{ reason?: string }} [opts]
   */
  const revokeRequest = useCallback(
    async (id, opts = {}) => updateRequestStatus(id, 'revoked', opts),
    [updateRequestStatus]
  );

  /**
   * PUBLIC_INTERFACE
   * withdrawRequest
   *
   * Allow investor to withdraw their own pending request.
   * @param {string} id
   * @param {{ reason?: string }} [opts]
   */
  const withdrawRequest = useCallback(
    async (id, opts = {}) => updateRequestStatus(id, 'withdrawn', opts),
    [updateRequestStatus]
  );

  // Auto-load relevant views by role
  useEffect(() => {
    // If investor, load their own requests
    if (userId) {
      refreshMine();
    }
  }, [userId, refreshMine]);

  useEffect(() => {
    // If founder/admin, load the full list
    if (canManage) {
      refreshAll();
    }
  }, [canManage, refreshAll]);

  // Derived: visible list based on role
  const visibleRequests = useMemo(() => {
    return canManage ? state.allRequests : state.myRequests;
  }, [canManage, state.allRequests, state.myRequests]);

  // Small helper memoized counters for analytics (basic)
  const counts = useMemo(() => {
    const list = canManage ? state.allRequests : state.myRequests;
    const counters = { total: list.length };
    for (const s of VALID_STATUS) counters[s] = 0;
    for (const item of list) {
      const s = normalizeStatus(item?.status) || 'pending';
      counters[s] = (counters[s] || 0) + 1;
    }
    return counters;
  }, [canManage, state.allRequests, state.myRequests]);

  return {
    // Data
    myRequests: state.myRequests,
    allRequests: state.allRequests,
    visibleRequests,

    // Capabilities
    canSubmit,
    canManage,

    // Loading & errors
    loadingMine: state.loadingMine,
    loadingAll: state.loadingAll,
    submitting: state.submitting,
    actionBusy: state.actionBusy,
    errorMine: state.errorMine,
    errorAll: state.errorAll,
    errorSubmit: state.errorSubmit,
    errorAction: state.errorAction,

    // PUBLIC_INTERFACE
    refreshMine,
    // PUBLIC_INTERFACE
    refreshAll,
    // PUBLIC_INTERFACE
    submitRequest,
    // PUBLIC_INTERFACE
    approveRequest,
    // PUBLIC_INTERFACE
    denyRequest,
    // PUBLIC_INTERFACE
    revokeRequest,
    // PUBLIC_INTERFACE
    withdrawRequest,
    // PUBLIC_INTERFACE
    updateRequestStatus,

    // Basic analytics helpers
    counts,
  };
}
