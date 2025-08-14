import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import ProtectedRoute from './components/common/ProtectedRoute';
import InvestorDashboard from './pages/InvestorDashboard';
import FounderDashboard from './pages/FounderDashboard';
import AdminPanel from './pages/AdminPanel';
import Documents from './pages/Documents';
import DocumentViewer from './pages/DocumentViewer';
import AuthCallback from './pages/auth/Callback';
import AuthError from './pages/auth/Error';
import DocumentList from './components/documents/DocumentList';
import useDocuments from './hooks/useDocuments';

/**
 * PUBLIC_INTERFACE
 * AppRoutes configures the base client-side routes for the application.
 * It includes protected routes for different roles and keeps placeholder pages
 * to satisfy existing tests (the Home page preserves the "Learn React" link).
 *
 * Routes:
 * - "/"                         -> Home (default landing)
 * - "/dashboard"                -> Dashboard (placeholder; any authenticated role)
 * - "/dashboard/investor"       -> InvestorDashboard (investor/admin)
 * - "/dashboard/founder"        -> FounderDashboard (founder/admin)
 * - "/documents"                -> Documents (investor/founder/admin)
 * - "/documents/:id"            -> DocumentViewer (investor/founder/admin)
 * - "/admin"                    -> AdminPanel (admin only)
 * - "/about"                    -> About (placeholder)
 * - "/login"                    -> Login page (magic link authentication)
 * - "*"                         -> NotFound (fallback)
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredRoles={['investor', 'founder', 'admin']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/investor"
        element={
          <ProtectedRoute requiredRoles={['investor', 'admin']}>
            <InvestorDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/founder"
        element={
          <ProtectedRoute requiredRoles={['founder', 'admin']}>
            <FounderDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/documents"
        element={
          <ProtectedRoute requiredRoles={['investor', 'founder', 'admin']}>
            <Documents />
          </ProtectedRoute>
        }
      />

      <Route
        path="/documents/:id"
        element={
          <ProtectedRoute requiredRoles={['investor', 'founder', 'admin']}>
            <DocumentViewer />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRoles={['admin']}>
            <AdminPanel />
          </ProtectedRoute>
        }
      />

      <Route path="/about" element={<About />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth/error" element={<AuthError />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// PUBLIC_INTERFACE
export function Home() {
  /**
   * Public landing page that shows tier-1 "Public" documents fetched from Supabase.
   * Anyone can view/download these without authentication or NDA.
   * The 'Learn React' link is preserved for existing tests.
   */
  const { items, loading, error, getSignedUrl, refresh } = useDocuments('public');

  return (
    <main className="container" style={{ padding: '2rem', display: 'grid', gap: '1rem' }}>
      <header>
        <h1 className="title" style={{ margin: 0 }}>Welcome to KAVIA Investor Data Room</h1>
        <p className="description" style={{ marginTop: 6, opacity: 0.9 }}>
          Explore our public materials below. Detailed content is available to qualified and NDA-signed investors.
        </p>
      </header>

      {/* Public documents section — open in new tab using signed URL; no auth required */}
      <section
        aria-label="Public Documents"
        style={{
          display: 'grid',
          gap: 12,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          padding: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <strong style={{ fontSize: 18 }}>Public Documents</strong>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', opacity: 0.9 }}>
            Examples: Pitch Deck, One Pager, General Overview
          </span>
          <div style={{ marginLeft: 'auto' }}>
            <button
              type="button"
              className="theme-toggle"
              style={{ padding: '6px 10px', fontSize: 12, height: 'auto' }}
              onClick={refresh}
              aria-label="Refresh public documents"
              title="Refresh"
            >
              Refresh
            </button>
          </div>
        </div>

        <DocumentList
          tier="public"
          items={items}
          loading={loading}
          error={error}
          onRefresh={refresh}
          getSignedUrl={getSignedUrl}
        />
      </section>

      {/* Keep this link to satisfy existing CRA tests */}
      <a
        className="App-link"
        href="https://reactjs.org"
        target="_blank"
        rel="noopener noreferrer"
      >
        Learn React
      </a>
    </main>
  );
}

// PUBLIC_INTERFACE
export function Dashboard() {
  /**
   * Placeholder dashboard page.
   */
  return (
    <main className="container" style={{ padding: '2rem' }}>
      <h1 className="title">Dashboard</h1>
      <p className="description">This is a placeholder for the future dashboard view.</p>
    </main>
  );
}

// PUBLIC_INTERFACE
export function About() {
  /**
   * Placeholder about page.
   */
  return (
    <main className="container" style={{ padding: '2rem' }}>
      <h1 className="title">About</h1>
      <p className="description">This is a placeholder About page for the investor data room.</p>
    </main>
  );
}

// PUBLIC_INTERFACE
export function NotFound() {
  /**
   * Fallback route for unknown paths.
   */
  return (
    <main className="container" style={{ padding: '2rem' }}>
      <h1 className="title">404 - Page Not Found</h1>
      <p className="description">The page you are looking for does not exist.</p>
    </main>
  );
}
