import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AccessRequestModal from '../components/modals/AccessRequestModal';
import NDAModal from '../components/modals/NDAModal';

/**
 * PUBLIC_INTERFACE
 * InvestorDashboard
 * 
 * Renders a basic placeholder dashboard view intended for users with the "investor" role.
 * Displays the authenticated user's email (if any) and their role claims for context.
 * 
 * Adds UI-only modals:
 * - Request Access (AccessRequestModal)
 * - Sign NDA (NDAModal)
 * 
 * Returns:
 * - JSX element: basic layout with heading, role visibility note, user/role info, and modal triggers
 */
export default function InvestorDashboard() {
  const { user, roleClaims } = useAuth();

  const [showAccess, setShowAccess] = useState(false);
  const [showNda, setShowNda] = useState(false);

  function handleAccessSubmit(payload) {
    // eslint-disable-next-line no-console
    console.log('[InvestorDashboard] Access request submitted:', payload);
  }
  function handleNdaSign(payload) {
    // eslint-disable-next-line no-console
    console.log('[InvestorDashboard] NDA signed (stub):', payload);
  }

  return (
    <section
      aria-label="Investor Dashboard"
      style={{
        display: 'grid',
        gap: '0.75rem',
        alignContent: 'start',
        padding: '1rem',
        color: 'var(--text-primary)',
      }}
    >
      <header>
        <h1 className="title" style={{ margin: 0 }}>Investor Dashboard</h1>
        <p className="description" style={{ opacity: 0.85, marginTop: 6 }}>
          Visible to: Investor role (and Admin for testing)
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
          Welcome{user?.email ? `, ${user.email}` : ''}. This is a placeholder for investor-specific content
          such as document listings, company updates, and tiered materials.
        </p>
        <div style={{ marginTop: 10, fontSize: 14, opacity: 0.8 }}>
          <strong>Your roles:</strong> {Array.isArray(roleClaims?.roles) && roleClaims.roles.length > 0 ? roleClaims.roles.join(', ') : 'none'}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowAccess(true)}
            style={{ paddingInline: 16, fontWeight: 600 }}
          >
            Request Access
          </button>
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setShowNda(true)}
            style={{ fontWeight: 600 }}
            aria-label="Open NDA signing modal"
          >
            Sign NDA
          </button>
        </div>
      </article>

      {/* Modals */}
      <AccessRequestModal
        isOpen={showAccess}
        onClose={() => setShowAccess(false)}
        onSubmit={handleAccessSubmit}
      />
      <NDAModal
        isOpen={showNda}
        onClose={() => setShowNda(false)}
        onSign={handleNdaSign}
      />
    </section>
  );
}
