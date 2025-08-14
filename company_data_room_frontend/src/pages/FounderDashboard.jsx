import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AccessRequestModal from '../components/modals/AccessRequestModal';
import NDAModal from '../components/modals/NDAModal';
import useRequests from '../hooks/useRequests';

/**
 * PUBLIC_INTERFACE
 * FounderDashboard
 *
 * Founder dashboard with access request management for all users.
 * Founders can approve/deny/revoke requests.
 */
export default function FounderDashboard() {
  const { user, roleClaims } = useAuth();
  const {
    allRequests,
    loadingAll,
    errorAll,
    approveRequest,
    denyRequest,
    revokeRequest,
    refreshAll,
    counts,
  } = useRequests();

  const [showAccess, setShowAccess] = useState(false);
  const [showNda, setShowNda] = useState(false);

  function handleNdaSign(payload) {
    // eslint-disable-next-line no-console
    console.log('[FounderDashboard] NDA signed (stub):', payload);
  }

  const list = useMemo(() => allRequests || [], [allRequests]);

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

  async function doAction(type, id) {
    if (!id) return;
    let reason = '';
    if (type !== 'approve') {
      reason = window.prompt('Optional reason:', '') || '';
    }
    if (type === 'approve') {
      await approveRequest(id, { reason: '' });
    } else if (type === 'deny') {
      await denyRequest(id, { reason });
    } else if (type === 'revoke') {
      await revokeRequest(id, { reason });
    }
  }

  function ManageList() {
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
        {(list || []).length === 0 && !loadingAll ? (
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
            No access requests submitted yet.
          </div>
        ) : (
          (list || []).map((req) => {
            const isPending = String(req.status || '').toLowerCase() === 'pending';
            const isApproved = String(req.status || '').toLowerCase() === 'approved';
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
                    <strong style={{ fontSize: 14 }}>
                      {req.email || 'Unknown user'} • Tier: {String(req.tier || '').toUpperCase()}
                    </strong>
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
                    {req.reason && (
                      <span style={{ marginLeft: 10, opacity: 0.9 }}>• Reason: {req.reason}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isPending && (
                    <>
                      <button
                        type="button"
                        className="theme-toggle"
                        onClick={() => doAction('approve', req.id)}
                        style={{ padding: '6px 10px', fontSize: 12, height: 'auto' }}
                        title="Approve request"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="theme-toggle"
                        onClick={() => doAction('deny', req.id)}
                        style={{ padding: '6px 10px', fontSize: 12, height: 'auto' }}
                        title="Deny request"
                      >
                        Deny
                      </button>
                    </>
                  )}
                  {isApproved && (
                    <button
                      type="button"
                      className="theme-toggle"
                      onClick={() => doAction('revoke', req.id)}
                      style={{ padding: '6px 10px', fontSize: 12, height: 'auto' }}
                      title="Revoke access"
                    >
                      Revoke
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
      aria-label="Founder Dashboard"
      style={{
        display: 'grid',
        gap: '0.75rem',
        alignContent: 'start',
        padding: '1rem',
        color: 'var(--text-primary)',
      }}
    >
      <header>
        <h1 className="title" style={{ margin: 0 }}>Founder Dashboard</h1>
        <p className="description" style={{ opacity: 0.85, marginTop: 6 }}>
          Visible to: Founder role (and Admin for testing)
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
          Welcome{user?.email ? `, ${user.email}` : ''}. Manage incoming access requests.
        </p>
        <div style={{ marginTop: 10, fontSize: 14, opacity: 0.8 }}>
          <strong>Your roles:</strong>{' '}
          {Array.isArray(roleClaims?.roles) && roleClaims.roles.length > 0 ? roleClaims.roles.join(', ') : 'none'}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowAccess(true)}
            style={{ paddingInline: 16, fontWeight: 600 }}
          >
            Request Access (as test)
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

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => refreshAll()}
              className="theme-toggle"
              aria-label="Refresh requests"
              style={{ padding: '6px 10px', fontSize: 12, height: 'auto' }}
            >
              Refresh
            </button>
          </div>
        </div>
      </article>

      <section aria-label="All Access Requests" style={{ display: 'grid', gap: 8 }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>All Access Requests</h2>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', opacity: 0.9 }}>
            Total: {counts?.total ?? (list?.length || 0)} • Pending: {counts?.pending ?? 0} • Approved: {counts?.approved ?? 0}
          </span>
        </header>

        {loadingAll && (
          <div aria-busy="true" style={{ color: 'var(--text-secondary)', fontSize: 14, opacity: 0.9 }}>
            Loading requests…
          </div>
        )}
        {errorAll && (
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
            {errorAll?.message || String(errorAll)}
          </div>
        )}

        <ManageList />
      </section>

      {/* Modals */}
      <AccessRequestModal
        isOpen={showAccess}
        onClose={() => setShowAccess(false)}
        onSubmit={() => {}}
      />
      <NDAModal
        isOpen={showNda}
        onClose={() => setShowNda(false)}
        onSign={handleNdaSign}
      />
    </section>
  );
}
