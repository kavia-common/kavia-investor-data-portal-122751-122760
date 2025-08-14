import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';

/**
 * PUBLIC_INTERFACE
 * AuthError
 *
 * Simple error page for authentication errors.
 */
export default function AuthError() {
  const [params] = useSearchParams();
  const m = params.get('m') || 'Authentication error.';

  return (
    <section
      aria-label="Authentication error"
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
          textAlign: 'center',
        }}
      >
        <h1 className="title" style={{ marginTop: 0 }}>Auth Error</h1>
        <p className="description" style={{ marginTop: 8, opacity: 0.85 }}>
          {decodeURIComponent(m)}
        </p>
        <div style={{ marginTop: 16 }}>
          <Link to="/login" className="theme-toggle" style={{ padding: '8px 12px' }}>
            Try again
          </Link>
        </div>
      </div>
    </section>
  );
}
