import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * PUBLIC_INTERFACE
 * ProtectedRoute enforces authentication and (optionally) role-based authorization for route segments.
 *
 * Usage patterns:
 * 1) Wrap a specific element inside a Route:
 *    <Route
 *      path="/dashboard"
 *      element={
 *        <ProtectedRoute requiredRoles={['investor', 'founder', 'admin']}>
 *          <Dashboard />
 *        </ProtectedRoute>
 *      }
 *    />
 *
 * 2) Guard a set of nested routes using Outlet:
 *    <Route element={<ProtectedRoute requiredRoles={['admin']} />}>
 *      <Route path="/admin" element={<AdminHome />} />
 *      <Route path="/admin/users" element={<Users />} />
 *    </Route>
 *
 * Props:
 * - requiredRoles?: string[] — list of roles any of which will allow access. Defaults to [] (auth-only).
 * - fallbackPath?: string — path to redirect unauthenticated users to. Defaults to "/login".
 * - unauthorizedFallback?: ReactNode — optional custom UI to render when authenticated but unauthorized.
 *
 * Behavior:
 * - If auth is loading: renders a lightweight loading state.
 * - If not authenticated: redirects to fallbackPath with { state: { from: location } } and replace=true.
 * - If authenticated but lacks a required role (if provided): renders an "Access Denied" message or unauthorizedFallback.
 * - Otherwise: renders children or an Outlet for nested routes.
 */

// PUBLIC_INTERFACE
export default function ProtectedRoute({
  children,
  requiredRoles = [],
  fallbackPath = '/login',
  unauthorizedFallback = null,
}) {
  const { isAuthenticated, loading, hasAnyRole } = useAuth();
  const location = useLocation();

  // While auth state resolves, show a minimal loading indicator.
  if (loading) {
    return (
      <div
        aria-busy="true"
        aria-live="polite"
        style={{
          display: 'grid',
          placeItems: 'center',
          minHeight: '30vh',
          color: 'var(--text-primary)',
        }}
      >
        Loading…
      </div>
    );
  }

  // If the user is not authenticated, bounce to login and remember the intended route.
  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} replace state={{ from: location }} />;
  }

  // If roles are specified, ensure the user has at least one.
  if (Array.isArray(requiredRoles) && requiredRoles.length > 0) {
    const authorized = hasAnyRole(requiredRoles);
    if (!authorized) {
      return unauthorizedFallback ?? <AccessDenied />;
    }
  }

  // Render children if provided (typical for element-wrapping usage),
  // otherwise render an <Outlet /> for nested routes.
  return children ? children : <Outlet />;
}

/**
 * PUBLIC_INTERFACE
 * AccessDenied is the default UI for authorized=false (authenticated but missing role).
 * It can be overridden via the unauthorizedFallback prop on ProtectedRoute.
 */
export function AccessDenied() {
  return (
    <section
      aria-label="Access denied"
      style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '60vh',
        color: 'var(--text-primary)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          padding: '1.25rem',
          boxSizing: 'border-box',
          boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
          textAlign: 'center',
        }}
      >
        <h1 className="title" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
          Access Denied
        </h1>
        <p className="description" style={{ margin: 0, opacity: 0.85 }}>
          You are signed in, but your account does not have permission to view this content.
        </p>
        <p className="description" style={{ marginTop: '0.75rem', opacity: 0.7, fontSize: 14 }}>
          If you believe this is a mistake, please contact the administrator or request access.
        </p>
      </div>
    </section>
  );
}
