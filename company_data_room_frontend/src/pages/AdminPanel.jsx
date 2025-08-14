import React from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * PUBLIC_INTERFACE
 * AdminPanel
 * 
 * Renders a basic placeholder admin panel view intended only for users with the "admin" role.
 * Displays the authenticated user's email (if any) and their role claims for context.
 * 
 * Returns:
 * - JSX element: basic layout with heading, role visibility note, and user/role info
 */
export default function AdminPanel() {
  const { user, roleClaims } = useAuth();

  return (
    <section
      aria-label="Admin Panel"
      style={{
        display: 'grid',
        gap: '0.75rem',
        alignContent: 'start',
        padding: '1rem',
        color: 'var(--text-primary)',
      }}
    >
      <header>
        <h1 className="title" style={{ margin: 0 }}>Admin Panel</h1>
        <p className="description" style={{ opacity: 0.85, marginTop: 6 }}>
          Visible to: Admin role only
        </p>
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
          Welcome{user?.email ? `, ${user.email}` : ''}. This is a placeholder for operations: flagged content review,
          analytics, user management, and activity logs.
        </p>
        <div style={{ marginTop: 10, fontSize: 14, opacity: 0.8 }}>
          <strong>Your roles:</strong> {Array.isArray(roleClaims?.roles) && roleClaims.roles.length > 0 ? roleClaims.roles.join(', ') : 'none'}
        </div>
      </article>
    </section>
  );
}
