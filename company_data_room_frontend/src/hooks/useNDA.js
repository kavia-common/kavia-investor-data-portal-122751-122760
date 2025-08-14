import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

/**
 * Internal helpers
 */
const STORAGE_PREFIX = 'nda_history';

// Statuses used by this hook (intended to map closely to DocuSign-type flows)
export const NDA_STATUS = Object.freeze({
  NOT_STARTED: 'not_started',
  INITIATED: 'initiated',
  PENDING_SIGNATURE: 'pending_signature',
  COMPLETED: 'completed',
  DECLINED: 'declined',
  ERROR: 'error',
});

/**
 * Build a localStorage key per user for NDA history.
 */
function storageKeyFor(user) {
  const uid = user?.id || null;
  const email = user?.email || null;
  if (uid) return `${STORAGE_PREFIX}:${uid}`;
  if (email) return `${STORAGE_PREFIX}:email:${String(email).toLowerCase()}`;
  return `${STORAGE_PREFIX}:anonymous`;
}

function readHistory(user) {
  try {
    const raw = localStorage.getItem(storageKeyFor(user));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(user, history) {
  try {
    localStorage.setItem(storageKeyFor(user), JSON.stringify(history || []));
  } catch {
    // ignore storage errors (quota, etc.)
  }
}

/**
 * PUBLIC_INTERFACE
 * useNDA
 *
 * A frontend hook to manage the NDA signing lifecycle.
 *
 * Features:
 * - initiateNDA: start the NDA process (stubbed Supabase Edge Function/API integration).
 * - getNDAStatus: check current status (stubbed backend, falls back to local history).
 * - pollStatus: poll the NDA status at intervals until completion/timeout.
 * - Maintains per-user NDA agreement history in localStorage as a stopgap until backend integration.
 * - Exposes UI gating helpers for "NDA tier" visibility.
 *
 * Expected backend integration (TODO markers inside code):
 * - supabase.functions.invoke('start_nda', ...) to create a signing ceremony and return signingUrl + agreementId
 * - supabase.functions.invoke('get_nda_status', ...) to fetch status for an agreement
 *
 * Environment variables:
 * - REACT_APP_SUPABASE_URL
 * - REACT_APP_SUPABASE_KEY
 *
 * Returns:
 * {
 *   ndaStatus,              // string: one of NDA_STATUS
 *   agreements,             // Array<Agreement>
 *   latestAgreement,        // Agreement | null
 *   canAccessNDATier,       // boolean: roleClaims.nda_signed OR any completed agreement
 *   isCompleted,            // () => boolean
 *   initiateNDA,            // (form) => Promise<{ data, error }>
 *   getNDAStatus,           // (agreementId?) => Promise<{ status, data, error }>
 *   pollStatus,             // (agreementId?, opts?) => { stop: () => void }
 *   markCompletedLocally,   // (agreementId) => void -- utility for integrating callback URLs
 *   resetLocalHistory,      // () => void -- clears local history for current user
 * }
 *
 * Agreement model (local):
 * {
 *   id: string,
 *   userId: string | null,
 *   email: string | null,
 *   form: { fullName?: string, email?: string, company?: string },
 *   provider: 'docusign' | 'mock',
 *   status: NDA_STATUS,
 *   signingUrl?: string,
 *   createdAt: string (ISO),
 *   updatedAt: string (ISO),
 *   completedAt?: string (ISO),
 *   error?: string | null,
 * }
 */
export default function useNDA() {
  const { user, roleClaims } = useAuth();

  // Local history and status
  const [agreements, setAgreements] = useState([]);
  const [ndaStatus, setNdaStatus] = useState(NDA_STATUS.NOT_STARTED);

  // Track mounted state to avoid state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load history whenever the user changes
  useEffect(() => {
    const history = readHistory(user);
    setAgreements(history);
    const latest = history[0] || null;
    setNdaStatus(latest?.status || NDA_STATUS.NOT_STARTED);
  }, [user?.id, user?.email]);

  const latestAgreement = useMemo(() => (agreements.length > 0 ? agreements[0] : null), [agreements]);

  // UI gating: allow NDA tier if roleClaims say nda_signed OR any completed agreement locally.
  const hasLocalCompleted = useMemo(
    () => agreements.some((a) => a?.status === NDA_STATUS.COMPLETED),
    [agreements]
  );
  const canAccessNDATier = useMemo(
    () => Boolean(roleClaims?.nda_signed) || hasLocalCompleted,
    [roleClaims?.nda_signed, hasLocalCompleted]
  );

  // PUBLIC_INTERFACE
  const isCompleted = useCallback(() => canAccessNDATier, [canAccessNDATier]);

  function persist(history) {
    writeHistory(user, history);
    if (mountedRef.current) {
      setAgreements(history);
      const latest = history[0] || null;
      setNdaStatus(latest?.status || NDA_STATUS.NOT_STARTED);
    }
  }

  /**
   * Create a new local agreement record.
   */
  function createLocalAgreement({ form, initialStatus = NDA_STATUS.PENDING_SIGNATURE, signingUrl, provider = 'mock' }) {
    const now = new Date().toISOString();
    const newAgreement = {
      id: cryptoRandomId(),
      userId: user?.id || null,
      email: user?.email || form?.email || null,
      form: form || {},
      provider,
      status: initialStatus,
      signingUrl,
      createdAt: now,
      updatedAt: now,
    };
    return newAgreement;
  }

  /**
   * Generates a random id for local objects (not for production use).
   */
  function cryptoRandomId() {
    try {
      // Prefer Web Crypto if available
      const r = crypto.getRandomValues(new Uint32Array(4));
      return Array.from(r)
        .map((x) => x.toString(16).padStart(8, '0'))
        .join('-');
    } catch {
      // Fallback
      return `nda_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
    }
  }

  // PUBLIC_INTERFACE
  const initiateNDA = useCallback(
    async (form = {}) => {
      /**
       * Initiates the NDA signing process.
       *
       * Parameters:
       *  - form: { fullName: string, email: string, company?: string }
       *
       * Returns:
       *  - { data, error }
       *
       * Behavior:
       *  - When Supabase is configured, this should call a Supabase Edge Function that:
       *      - creates a DocuSign envelope
       *      - returns a signingUrl and agreementId (envelopeId)
       *  - For now, we stub this behavior and create a local agreement entry.
       */
      try {
        if (!user?.id && !form?.email) {
          return { data: null, error: new Error('User or email is required to initiate NDA') };
        }

        // TODO: Replace stub with actual Supabase Edge Function invocation
        // Example:
        // const { data, error } = await supabase.functions.invoke('start_nda', {
        //   body: {
        //     userId: user?.id ?? null,
        //     email: form?.email ?? user?.email ?? null,
        //     fullName: form?.fullName ?? '',
        //     company: form?.company ?? '',
        //     redirectTo: process.env.REACT_APP_SITE_URL || window.location.origin,
        //   },
        // });
        // if (error) return { data: null, error };
        // const { signingUrl, agreementId, provider = 'docusign' } = data || {};

        const signingUrl =
          process.env.NODE_ENV !== 'production'
            ? 'https://example.com/mock-signing' // mock URL for local testing
            : undefined;

        // Local mock agreement
        const newAgreement = createLocalAgreement({
          form,
          initialStatus: NDA_STATUS.PENDING_SIGNATURE,
          signingUrl,
          provider: 'mock', // set to 'docusign' when integrating real provider
        });

        persist([newAgreement, ...agreements]);
        return { data: newAgreement, error: null };
      } catch (e) {
        return { data: null, error: e };
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, user?.email, agreements]
  );

  // PUBLIC_INTERFACE
  const getNDAStatus = useCallback(
    async (agreementId = null) => {
      /**
       * Retrieves current NDA status for the specified agreement or the latest one if omitted.
       *
       * Parameters:
       *  - agreementId?: string
       *
       * Returns:
       *  - { status, data, error }
       *
       * Behavior:
       *  - When integrated, calls a Supabase Edge Function to fetch provider status.
       *  - Currently, reads from local history for the matching agreement.
       */
      try {
        const target =
          (agreementId && agreements.find((a) => a.id === agreementId)) || (agreements.length > 0 ? agreements[0] : null);
        if (!target) {
          return { status: NDA_STATUS.NOT_STARTED, data: null, error: null };
        }

        // TODO: Replace stub with actual Supabase Edge Function invocation
        // const { data, error } = await supabase.functions.invoke('get_nda_status', {
        //   body: { agreementId: target.id },
        // });
        // if (error) return { status: target.status, data: null, error };
        // const providerStatus = data?.status;
        // Map providerStatus to NDA_STATUS and update local history if changed.

        return { status: target.status, data: target, error: null };
      } catch (e) {
        return { status: NDA_STATUS.ERROR, data: null, error: e };
      }
    },
    [agreements]
  );

  // PUBLIC_INTERFACE
  const pollStatus = useCallback(
    (agreementId = null, options = {}) => {
      /**
       * Polls NDA status periodically until it reaches a terminal state or times out.
       *
       * Parameters:
       *  - agreementId?: string  — defaults to latest
       *  - options?: {
       *      intervalMs?: number,     // default 4000
       *      timeoutMs?: number,      // default 300000 (5 min)
       *      onUpdate?: (status, agreement) => void,
       *      stopOn?: Set<string>     // statuses that stop polling (defaults to COMPLETED/DECLINED/ERROR)
       *    }
       *
       * Returns:
       *  - { stop: () => void }
       */
      const intervalMs = Number(options.intervalMs || 4000);
      const timeoutMs = Number(options.timeoutMs || 300000);
      const onUpdate = typeof options.onUpdate === 'function' ? options.onUpdate : () => {};
      const defaultStopOn = new Set([NDA_STATUS.COMPLETED, NDA_STATUS.DECLINED, NDA_STATUS.ERROR]);
      const stopOn = options.stopOn instanceof Set ? options.stopOn : defaultStopOn;

      let active = true;
      let intervalId = null;
      let timeoutId = null;

      const runCheck = async () => {
        if (!active) return;
        const { status, data } = await getNDAStatus(agreementId);
        if (!active) return;

        // Simulated auto-complete behavior for the mock flow: if pending for > ~3 polls, complete locally.
        // This is purely for demo/testing purposes.
        if (status === NDA_STATUS.PENDING_SIGNATURE) {
          // no-op; leave it to user action or callback to complete
        }

        onUpdate(status, data);

        if (stopOn.has(status)) {
          stop();
        }
      };

      const stop = () => {
        active = false;
        if (intervalId) clearInterval(intervalId);
        if (timeoutId) clearTimeout(timeoutId);
        intervalId = null;
        timeoutId = null;
      };

      // Start timers
      runCheck();
      intervalId = setInterval(runCheck, intervalMs);
      timeoutId = setTimeout(() => {
        // Time out
        onUpdate(NDA_STATUS.ERROR, null);
        stop();
      }, timeoutMs);

      return { stop };
    },
    [getNDAStatus]
  );

  // PUBLIC_INTERFACE
  const markCompletedLocally = useCallback(
    (agreementId) => {
      /**
       * Utility to mark an agreement as completed locally.
       * Useful for integrating redirect/callback-based completion events without a backend yet.
       */
      if (!agreementId) return;
      const now = new Date().toISOString();
      const updated = agreements.map((a) =>
        a.id === agreementId
          ? { ...a, status: NDA_STATUS.COMPLETED, updatedAt: now, completedAt: now }
          : a
      );
      persist(updated);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agreements]
  );

  // PUBLIC_INTERFACE
  const resetLocalHistory = useCallback(() => {
    /** Clears local NDA history for the current user. */
    persist([]);
  }, []);

  return {
    // state
    ndaStatus,
    agreements,
    latestAgreement,

    // gating
    canAccessNDATier,
    isCompleted,

    // actions
    initiateNDA,
    getNDAStatus,
    pollStatus,
    markCompletedLocally,
    resetLocalHistory,
  };
}
