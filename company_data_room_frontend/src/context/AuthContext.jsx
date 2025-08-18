import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { getURL } from '../utils/getURL';
import { syncUserToSQLTable } from '../services/userSyncService';

/**
 * PUBLIC_INTERFACE
 * AuthContext provides authentication state and actions for the application.
 * It encapsulates:
 *  - Supabase session and user tracking
 *  - Magic link login (passwordless)
 *  - Logout
 *  - Role/claim parsing from user/app metadata (founder, investor, admin, qualified, nda_signed)
 * 
 * Behavior when Supabase is not configured:
 *  - The provider will not throw; it exposes inert methods (that return errors) and a null session.
 *  - This allows the app to render in non-configured environments (CI/tests) without crashing.
 */

// Default role claims structure
const defaultRoleClaims = {
  founder: false,
  investor: false,
  admin: false,
  qualified: false,
  nda_signed: false,
  roles: []
};

// Internal helper to parse roles/flags from Supabase user object
function parseRoleClaims(user) {
  if (!user) return { ...defaultRoleClaims };

  // Try to get roles from app_metadata or user_metadata
  const userAppMeta = user.app_metadata || {};
  const userMeta = user.user_metadata || {};

  const rawRoles = userAppMeta.roles || userMeta.roles || [];
  const roles = Array.isArray(rawRoles) ? rawRoles.map(String) : [];
  const lowered = roles.map((r) => r.toLowerCase());

  // Flags might also be present directly in user_metadata
  const qualified =
    Boolean(userMeta.qualified) ||
    Boolean(userMeta.qualified_investor) ||
    lowered.includes('qualified');

  const ndaSigned =
    Boolean(userMeta.nda_signed) ||
    Boolean(userMeta.nda) ||
    lowered.includes('nda_signed');

  const claims = {
    founder: lowered.includes('founder'),
    investor: lowered.includes('investor'),
    admin: lowered.includes('admin'),
    qualified,
    nda_signed: ndaSigned,
    roles
  };

  return claims;
}

const AuthContext = createContext({
  session: null,
  user: null,
  loading: true,
  isAuthenticated: false,
  roleClaims: { ...defaultRoleClaims },
  // Methods
  // PUBLIC_INTERFACE
  loginWithMagicLink: async (_email) => ({ data: null, error: new Error('Supabase is not configured') }),
  // PUBLIC_INTERFACE
  logout: async () => ({ error: new Error('Supabase is not configured') }),
  // PUBLIC_INTERFACE
  hasRole: (_role) => false,
  // PUBLIC_INTERFACE
  hasAnyRole: (_roles) => false,
});

// PUBLIC_INTERFACE
export function AuthProvider({ children }) {
  /**
   * AuthProvider manages the Supabase session lifecycle, exposes login/logout actions,
   * and computes role claims for fine-grained UI gating.
   * 
   * Env vars used:
   * - REACT_APP_SUPABASE_URL
   * - REACT_APP_SUPABASE_KEY
   * - REACT_APP_SITE_URL (optional; used for magic-link redirect; falls back to window.location.origin)
   */
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [roleClaims, setRoleClaims] = useState({ ...defaultRoleClaims });
  const [loading, setLoading] = useState(true);

  // Initialize session on mount and subscribe to auth state changes
  useEffect(() => {
    let mounted = true;
    let subscription = null;

    async function init() {
      try {
        if (!supabase) {
          // No configuration: keep app running without auth features
          setSession(null);
          setUser(null);
          setRoleClaims({ ...defaultRoleClaims });
          setLoading(false);
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.warn('[AuthProvider] Supabase client not configured. Auth features are disabled.');
          }
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) {
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.warn('[AuthProvider] Error reading session:', error.message);
          }
        }
        if (!mounted) return;

        const currentSession = data?.session ?? null;
        setSession(currentSession);
        const currentUser = currentSession?.user ?? null;
        setUser(currentUser);
        setRoleClaims(parseRoleClaims(currentUser));
        setLoading(false);

        // Listen to auth state changes
        const listener = supabase.auth.onAuthStateChange((_event, newSession) => {
          if (!mounted) return;
          setSession(newSession);
          const newUser = newSession?.user ?? null;
          setUser(newUser);
          setRoleClaims(parseRoleClaims(newUser));
        });

        subscription = listener?.data?.subscription ?? null;
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.error('[AuthProvider] Unexpected initialization error:', e);
        }
        if (!mounted) return;
        setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // After user state changes: ensure user is in the SQL users table (no duplicates)
  useEffect(() => {
    if (user && user.id && user.email) {
      (async () => {
        try {
          await syncUserToSQLTable(user);
        } catch (e) {
          // Log or handle error if needed
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.error('[AuthProvider] Failed syncing user with SQL table:', e);
          }
        }
      })();
    }
  }, [user]);

  // PUBLIC_INTERFACE
  async function loginWithMagicLink(email) {
    /**
     * Sends a passwordless magic link to the provided email using Supabase OTP.
     * 
     * Parameters:
     *  - email: string — recipient's email for the magic link
     * 
     * Returns:
     *  - { data, error } from supabase.auth.signInWithOtp
     * 
     * Notes:
     *  - REACT_APP_SITE_URL should be set for production deployments; it controls the post-login redirect.
     *  - If REACT_APP_SITE_URL is not set, falls back to window.location.origin.
     *  - If no users with admin role, this user will be assigned roles: ['admin'] on signup (automatic first-admin logic).
     */
    if (!supabase) {
      const error = new Error('Supabase is not configured. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.');
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[AuthProvider.loginWithMagicLink] Attempted login without Supabase config.');
      }
      return { data: null, error };
    }

    // Patch: Set roles: ['admin'] in user_metadata app_metadata if no admins exist (first signup) [see services/adminSignupHelper.js]
    let user_metadata = {};
    try {
      const { getSignupMetadataWithAdminIfFirstUser } = await import('../services/adminSignupHelper');
      user_metadata = await getSignupMetadataWithAdminIfFirstUser();
    } catch (e) {
      // fallback: no admin role included
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[AuthProvider] Could not import adminSignupHelper or run check:', e?.message || e);
      }
      user_metadata = {};
    }

    const redirectTo = `${getURL()}auth/callback`;
    return supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        // Pass custom user metadata for first signup
        data: user_metadata && Object.keys(user_metadata).length > 0 ? user_metadata : undefined,
      },
    });
  }

  // PUBLIC_INTERFACE
  async function logout() {
    /**
     * Signs the current user out from Supabase auth.
     * 
     * Returns:
     *  - { error } — null on success, Error on failure
     */
    if (!supabase) {
      const error = new Error('Supabase is not configured. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.');
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[AuthProvider.logout] Attempted logout without Supabase config.');
      }
      return { error };
    }
    const { error } = await supabase.auth.signOut();
    return { error };
  }

  // PUBLIC_INTERFACE
  function hasRole(role) {
    /** Convenience checker for a single role flag. */
    if (!role) return false;
    const key = String(role).toLowerCase();
    return Boolean(roleClaims[key]);
  }

  // PUBLIC_INTERFACE
  function hasAnyRole(requiredRoles = []) {
    /** Checks if the user has any of the provided roles. */
    if (!Array.isArray(requiredRoles) || requiredRoles.length === 0) return false;
    return requiredRoles.some((r) => hasRole(r));
  }

  const ctxValue = useMemo(
    () => ({
      session,
      user,
      loading,
      isAuthenticated: Boolean(user),
      roleClaims,
      loginWithMagicLink,
      logout,
      hasRole,
      hasAnyRole,
    }),
    [session, user, loading, roleClaims]
  );

  return <AuthContext.Provider value={ctxValue}>{children}</AuthContext.Provider>;
}

// PUBLIC_INTERFACE
export function useAuth() {
  /** Returns the full auth context with state and auth methods. */
  return useContext(AuthContext);
}

// PUBLIC_INTERFACE
export function useSession() {
  /** Returns the current Supabase session (or null). */
  const { session } = useContext(AuthContext);
  return session;
}

// PUBLIC_INTERFACE
export function useUser() {
  /** Returns the current authenticated user (or null). */
  const { user } = useContext(AuthContext);
  return user;
}

// PUBLIC_INTERFACE
export function useRoleClaims() {
  /** Returns parsed role claims: founder, investor, admin, qualified, nda_signed and roles[]. */
  const { roleClaims } = useContext(AuthContext);
  return roleClaims;
}

// PUBLIC_INTERFACE
export function useIsAuthenticated() {
  /** Returns a boolean indicating whether a user is authenticated. */
  const { isAuthenticated } = useContext(AuthContext);
  return isAuthenticated;
}

export default AuthProvider;
