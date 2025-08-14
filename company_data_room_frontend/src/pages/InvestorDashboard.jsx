import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AccessRequestModal from '../components/modals/AccessRequestModal';
import NDAModal from '../components/modals/NDAModal';
import useRequests from '../hooks/useRequests';
import useNDA, { NDA_STATUS } from '../hooks/useNDA';

/**
 * PUBLIC_INTERFACE
 * InvestorDashboard
 *
 * Investor dashboard with request submission and tracking.
 * Shows current user's requests with ability to withdraw pending ones.
 * Adds NDA status badge and quick entry to signing flow.
 */
export default function InvestorDashboard() {
  const { user, roleClaims } = useAuth();
  const {
    myRequests,
    visibleRequests,
    loadingMine,
    errorMine,
    withdrawRequest,
    refreshMine,
    counts,
  } = useRequests();

  // NDA state
  const { canAccessNDATier, ndaStatus } = useNDA();

  const [showAccess, setShowAccess] = useState(false);
  const [showNda, setShowNda] = useState(false);

  function handleNdaSign(payload) {
    // eslint-disable-next-line no-console
    console.log('[InvestorDashboard] NDA signed (stub):', payload);
  }

  const list = useMemo(() => visibleRequests || myRequests || [], [visibleRequests, myRequests]);

  function StatusBadge({ status = 'pending' }) {
    const map = {
      approved: '#31C48D',
      denied: '#dc3545',
      revoked: '#b02a37',
      withdrawn: '#6c757d',
      pending: '#F4B25A',
    };
    const color = map[String(status).toLowerCase()] || '#F4B25A';
    return (
      <span
        style={{
          fontSize: 11,
          padding: '2px 6px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          color,
          fontWeight: 700,
        }}
        title={`Status: ${status}`}
      >
        {String(status).toUpperCase()}
      </span>
    );
  }

  function NDABadge() {
    const isSigned = Boolean(canAccessNDATier);
    const label = isSigned ? 'NDA: Signed' : (ndaStatus === NDA_STATUS.PENDING_SIGNATURE ? 'NDA: Pending' : 'NDA: Required');
    const color = isSigned ? '#31C48D' : ndaStatus === NDA_STATUS.PENDING_SIGNATURE ? '#F4B25A' : '#F4B25A';
    return (
      <span
        style={{
          fontSize: 11,
          padding: '2px 6px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          color,
          fontWeight: 700,
        }}
        title={label}
      >
        {label}
      </span>
    );
  }

  async function handleWithdraw(id) {
    if (!id) return;
    // eslint-disable-next-line no-alert
    const ok = window.confirm('Withdraw this request?');
    if (!ok) return;
    const { error } = await withdrawRequest(id, { reason: 'Investor withdrew request' });
    if (error) {
      // eslint-disable-next-line no-alert
      alert(error?.message || 'Failed to withdraw request.');
    }
  }

  function RequestList() {
    return (
      <div
        role="list"
        style={{
          display: 'grid',
          gap: 10,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          padding: '0.75rem',
        }}
      >
        {(list || []).length === 0 && !loadingMine ? (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--text-secondary)',
              opacity: 0.85,
              border: '1px dashed var(--border-color)',
              borderRadius: 10,
              padding: '16px 12px',
            }}
          >
            You haven’t submitted any requests yet.
          </div>
        ) : (
          (list || []).map((req) => {
            const isPending = String(req.status || '').toLowerCase() === 'pending';
            return (
              <div
                key={req.id}
                role="listitem"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 10,
                  padding: '10px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: 10,
                  background: 'transparent',
                }}
              >
                <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: 14 }}>Tier: {String(req.tier || '').toUpperCase()}</strong>
                    <StatusBadge status={req.status} />
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
                      {req.createdAt ? new Date(req.createdAt).toLocaleString() : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    <span>Organization: {req.organization || '-'}</span>
                    {req.notes && (
                      <span style={{ marginLeft: 10, opacity: 0.9 }}>• Notes: {req.notes}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isPending && (
                    <button
                      type="button"
                      className="theme-toggle"
                      onClick={() => handleWithdraw(req.id)}
                      style={{ padding: '6px 10px', fontSize: 12, height: 'auto' }}
                      title="Withdraw request"
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    );
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

        {/* NDA status strip */}
        <div
          role="note"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 8,
            padding: '8px 10px',
            borderRadius: 10,
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
          }}
        >
          <NDABadge />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {canAccessNDATier
              ? 'You can access NDA-protected documents.'
              : 'NDA is required to access sensitive documents.'}
          </span>
          {!canAccessNDATier && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setShowNda(true)}
              style={{ marginLeft: 'auto', paddingInline: 12 }}
            >
              Sign NDA
            </button>
          )}
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
          Welcome{user?.email ? `, ${user.email}` : ''}. Track your access requests and documents here.
        </p>
        <div style={{ marginTop: 10, fontSize: 14, opacity: 0.8 }}>
          <strong>Your roles:</strong>{' '}
          {Array.isArray(roleClaims?.roles) && roleClaims.roles.length > 0 ? roleClaims.roles.join(', ') : 'none'}
        </div>

        {/* Actions */}
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
            {canAccessNDATier ? 'View NDA status' : 'Sign NDA'}
          </button>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={refreshMine}
              className="theme-toggle"
              aria-label="Refresh requests"
              style={{ padding: '6px 10px', fontSize: 12, height: 'auto' }}
            >
              Refresh
            </button>
          </div>
        </div>
      </article>

      <section aria-label="Access Requests" style={{ display: 'grid', gap: 8 }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Your Access Requests</h2>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', opacity: 0.9 }}>
            Total: {counts?.total ?? (list?.length || 0)} • Pending: {counts?.pending ?? 0} • Approved: {counts?.approved ?? 0}
          </span>
        </header>

        {loadingMine && (
          <div aria-busy="true" style={{ color: 'var(--text-secondary)', fontSize: 14, opacity: 0.9 }}>
            Loading your requests…
          </div>
        )}
        {errorMine && (
          <div
            role="alert"
            style={{
              color: 'var(--text-primary)',
              background: 'rgba(220, 53, 69, 0.12)',
              border: '1px solid rgba(220, 53, 69, 0.3)',
              borderRadius: 10,
              padding: '10px 12px',
            }}
          >
            {errorMine?.message || String(errorMine)}
          </div>
        )}

        <RequestList />
      </section>

      {/* Modals */}
      <AccessRequestModal
        isOpen={showAccess}
        onClose={() => setShowAccess(false)}
        onSubmit={() => {
          // Optional: a small toast could be added later
        }}
      />
      <NDAModal
        isOpen={showNda}
        onClose={() => setShowNda(false)}
        onSign={handleNdaSign}
      />
    </section>
  );
}
