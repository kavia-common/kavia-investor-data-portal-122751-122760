import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * PUBLIC_INTERFACE
 * DocumentViewer
 * 
 * Renders a stub viewer page for a specific document ID. This is a placeholder without real file preview logic.
 * Shows document ID from URL params and basic role visibility information.
 * 
 * Returns:
 * - JSX element: document detail placeholder with back navigation and user roles
 */
export default function DocumentViewer() {
  const { id } = useParams();
  const { roleClaims } = useAuth();

  return (
    <section
      aria-label="Document Viewer"
      style={{
        display: 'grid',
        gap: '0.75rem',
        alignContent: 'start',
        padding: '1rem',
        color: 'var(--text-primary)',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link
          to="/documents"
          aria-label="Back to documents"
          style={{
            textDecoration: 'none',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            padding: '6px 10px',
          }}
        >
          ← Back
        </Link>
        <div>
          <h1 className="title" style={{ margin: 0 }}>Document Viewer</h1>
          <p className="description" style={{ opacity: 0.85, marginTop: 6 }}>
            Visible to: Investor, Founder, Admin
          </p>
        </div>
      </header>

      <article
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          padding: '1rem',
        }}
      >
        <p style={{ margin: 0 }}>
          Placeholder viewer for document:
          <strong> {id}</strong>
        </p>
        <p className="description" style={{ opacity: 0.85 }}>
          In future steps, this page will render a secure preview (PDF/video) with tiered access controls.
        </p>
      </article>

      <footer style={{ fontSize: 14, opacity: 0.8 }}>
        <strong>Your roles:</strong> {Array.isArray(roleClaims?.roles) && roleClaims.roles.length > 0 ? roleClaims.roles.join(', ') : 'none'}
      </footer>
    </section>
  );
}
