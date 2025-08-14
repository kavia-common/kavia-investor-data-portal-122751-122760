import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * PUBLIC_INTERFACE
 * Documents
 * 
 * Renders a stub list view for company documents. This is a placeholder, not connected to any API yet.
 * Shows example links to DocumentViewer for demonstration.
 * 
 * Returns:
 * - JSX element: simple document list with role visibility and sample navigation
 */
export default function Documents() {
  const { roleClaims } = useAuth();

  const sampleDocs = [
    { id: 'teaser', name: 'Company Teaser (Public Tier)' },
    { id: 'financials-q2', name: 'Financials Q2 (Qualified Tier)' },
    { id: 'msa-sample', name: 'MSA Sample (NDA Tier)' },
  ];

  return (
    <section
      aria-label="Documents"
      style={{
        display: 'grid',
        gap: '0.75rem',
        alignContent: 'start',
        padding: '1rem',
        color: 'var(--text-primary)',
      }}
    >
      <header>
        <h1 className="title" style={{ margin: 0 }}>Documents</h1>
        <p className="description" style={{ opacity: 0.85, marginTop: 6 }}>
          Visible to: Investor, Founder, Admin
        </p>
      </header>

      <div
        role="list"
        style={{
          display: 'grid',
          gap: 8,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          padding: '1rem',
        }}
      >
        {sampleDocs.map((doc) => (
          <Link
            key={doc.id}
            role="listitem"
            to={`/documents/${encodeURIComponent(doc.id)}`}
            style={{
              display: 'block',
              textDecoration: 'none',
              color: 'var(--text-primary)',
              padding: '0.6rem 0.7rem',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              background: 'transparent',
            }}
          >
            {doc.name}
          </Link>
        ))}
      </div>

      <footer style={{ fontSize: 14, opacity: 0.8 }}>
        <strong>Your roles:</strong> {Array.isArray(roleClaims?.roles) && roleClaims.roles.length > 0 ? roleClaims.roles.join(', ') : 'none'}
      </footer>
    </section>
  );
}
