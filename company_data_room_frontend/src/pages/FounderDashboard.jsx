import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AccessRequestModal from '../components/modals/AccessRequestModal';
import NDAModal from '../components/modals/NDAModal';
import useRequests from '../hooks/useRequests';
import useNotifications from '../hooks/useNotifications';
import useAnalytics from '../hooks/useAnalytics';

/**
 * PUBLIC_INTERFACE
 * FounderDashboard
 *
 * Founder dashboard with access request management for all users,
 * plus a recent activity feed and analytics widgets tailored to founder/admin roles.
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

  const {
    items: notifItems,
    unreadCount: notifUnread,
    loading: notifLoading,
    error: notifError,
    refresh: refreshNotifs,
    markAllRead: markAllNotifsRead,
    markRead: markNotifRead,
  } = useNotifications();

  // Analytics hook: document views, requests pending count, activity summary/items
  const {
    loading: aLoading,
    error: aError,
    views,
    requests,
    activity,
    recentViews,
    refresh: refreshAnalytics,
  } = useAnalytics({ timeRangeDays: 30 });

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
                    {req.notes && <span style={{ marginLeft: 10, opacity: 0.9 }}>• Notes: {req.notes}</span>}
                    {req.reason && <span style={{ marginLeft: 10, opacity: 0.9 }}>• Reason: {req.reason}</span>}
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

  // Recent activity utilities
  function toRelativeTime(dateIso) {
    if (!dateIso) return '';
    const dt = new Date(dateIso);
    const diff = Date.now() - dt.getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return dt.toLocaleDateString();
  }

  function TierChip({ tier }) {
    if (!tier) return null;
    const label = String(tier).toUpperCase();
    return (
      <span
        style={{
          fontSize: 11,
          padding: '2px 6px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'var(--text-secondary)',
        }}
        title={`Tier: ${label}`}
      >
        {label}
      </span>
    );
  }

  function ActivityItem({ n }) {
    const isUnread = String(n.status || '').toLowerCase() === 'unread';
    const leftBarColor = isUnread ? 'var(--brand-primary)' : 'transparent';
    const opacity = isUnread ? 1 : 0.9;

    const tier = n?.metadata?.tier || null;
    const status = n?.metadata?.status || null;

    return (
      <div
        role="listitem"
        tabIndex={0}
        aria-label={`${n.title}. ${n.body}`}
        style={{
          display: 'grid',
          gridTemplateColumns: '6px 1fr',
          gap: 10,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 10,
          padding: '10px 12px',
          opacity,
          outline: 'none',
        }}
        onClick={() => {
          if (isUnread) {
            markNotifRead(n.id);
          }
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 6,
            borderRadius: 4,
            background: leftBarColor,
          }}
        />
        <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <strong
              style={{
                color: 'var(--text-primary)',
                fontSize: 14,
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={n.title}
            >
              {n.title}
            </strong>
            <TierChip tier={tier} />
            {status && <StatusBadge status={status} />}
            <span
              aria-label="time"
              style={{
                marginLeft: 'auto',
                fontSize: 12,
                color: 'var(--text-muted)',
                opacity: 0.9,
                whiteSpace: 'nowrap',
              }}
              title={n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
            >
              {toRelativeTime(n.createdAt)}
            </span>
          </div>
          <p
            style={{
              margin: 0,
              color: 'var(--text-secondary)',
              fontSize: 13,
              lineHeight: 1.35,
            }}
          >
            {n.body}
          </p>
        </div>
      </div>
    );
  }

  // CSV export for audit/activity log (analytics-based)
  function downloadActivityCSV() {
    const rows = Array.isArray(activity?.items) ? activity.items : [];
    const header = [
      'id',
      'type',
      'title',
      'body',
      'created_at',
      'status',
      'tier',
      'actor_user_id',
      'target_user_id',
      'target_email',
    ];
    const csvEscape = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    };
    const dataRows = rows.map((r) => [
      r.id,
      r.type,
      r.title,
      r.body,
      r.createdAt,
      r.status,
      r.tier,
      r.actorUserId,
      r.targetUserId,
      r.targetEmail,
    ]);
    const csv =
      `${header.map(csvEscape).join(',')}\n` +
      dataRows.map((row) => row.map(csvEscape).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    link.href = url;
    link.setAttribute('download', `kavia_audit_log_${ts}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const recentNotifs = useMemo(() => {
    const items = Array.isArray(notifItems) ? notifItems.slice() : [];
    items.sort((a, b) => {
      const tA = new Date(a.createdAt || 0).getTime();
      const tB = new Date(b.createdAt || 0).getTime();
      return tB - tA;
    });
    return items.slice(0, 10);
  }, [notifItems]);

  // Small stat card
  function StatCard({ label, value, sublabel }) {
    return (
      <div
        style={{
          border: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
          borderRadius: 12,
          padding: '12px',
          display: 'grid',
          gap: 6,
          minWidth: 0,
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
        <strong style={{ fontSize: 22, lineHeight: 1 }}>{value}</strong>
        {sublabel && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sublabel}</span>
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
          display: 'grid',
          gap: 12,
        }}
      >
        <div>
          <p style={{ margin: 0 }}>
            Welcome{user?.email ? `, ${user.email}` : ''}. Manage incoming access requests, review analytics, and track recent activity.
          </p>
          <div style={{ marginTop: 10, fontSize: 14, opacity: 0.8 }}>
            <strong>Your roles:</strong>{' '}
            {Array.isArray(roleClaims?.roles) && roleClaims.roles.length > 0 ? roleClaims.roles.join(', ') : 'none'}
          </div>
        </div>

        {/* Analytics Overview */}
        <section aria-label="Analytics Overview" style={{ display: 'grid', gap: 10 }}>
          <header style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Analytics Overview</h2>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', opacity: 0.9 }}>
              {aLoading ? 'Loading…' : ''}
              {aError ? ` • ${aError.message || 'Analytics error'}` : ''}
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => refreshAnalytics()}
                className="theme-toggle"
                aria-label="Refresh analytics"
                style={{ padding: '6px 10px', fontSize: 12, height: 'auto' }}
                title="Refresh analytics"
              >
                Refresh Analytics
              </button>
            </div>
          </header>

          {/* Counters */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 10,
            }}
          >
            <StatCard label="Total Views (30d)" value={views?.totalViews ?? 0} />
            <StatCard label="Unique Viewers" value={views?.uniqueViewers ?? 0} />
            <StatCard label="Pending Requests" value={requests?.pending ?? 0} />
            <StatCard
              label="Views by Tier"
              value={`${views?.byTier?.public ?? 0} / ${views?.byTier?.qualified ?? 0} / ${views?.byTier?.nda ?? 0}`}
              sublabel="Public / Qualified / NDA"
            />
          </div>

          {/* Top Documents */}
          <div
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: 12,
              overflow: 'hidden',
              background: 'transparent',
            }}
          >
            <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <strong>Top Documents</strong>
            </div>
            <div style={{ display: 'grid', gap: 8, padding: '10px 12px' }}>
              {(views?.topDocuments || []).length === 0 ? (
                <span style={{ color: 'var(--text-secondary)', fontSize: 13, opacity: 0.9 }}>No document views yet.</span>
              ) : (
                (views.topDocuments || []).map((d) => (
                  <div
                    key={`${d.path}-${d.last_viewed_at || ''}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: 8,
                      border: '1px solid var(--border-color)',
                      borderRadius: 10,
                      padding: '8px 10px',
                      background: 'var(--bg-secondary)',
                    }}
                  >
                    <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <strong
                          title={d.path}
                          style={{
                            fontSize: 14,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {d.path}
                        </strong>
                        <TierChip tier={d.tier} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        Last viewed: {d.last_viewed_at ? new Date(d.last_viewed_at).toLocaleString() : '—'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Views</span>
                      <strong>{d.views}</strong>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Unique</span>
                      <strong>{d.unique_viewers}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Viewers */}
          <div
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: 12,
              overflow: 'hidden',
              background: 'transparent',
            }}
          >
            <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <strong>Recent Viewers</strong>
            </div>
            <div style={{ display: 'grid', gap: 8, padding: '10px 12px' }}>
              {(recentViews || []).length === 0 ? (
                <span style={{ color: 'var(--text-secondary)', fontSize: 13, opacity: 0.9 }}>No recent viewers.</span>
              ) : (
                (recentViews || []).map((v) => (
                  <div
                    key={v.id || `${v.path}-${v.createdAt || ''}-${v.email || v.userId || 'anon'}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: 8,
                      border: '1px solid var(--border-color)',
                      borderRadius: 10,
                      padding: '8px 10px',
                      background: 'var(--bg-secondary)',
                    }}
                  >
                    <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <strong
                          style={{
                            fontSize: 14,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={v.path}
                        >
                          {v.email || v.userId || 'Anon'} viewed {v.path || 'document'}
                        </strong>
                        <TierChip tier={v.tier} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {v.createdAt ? new Date(v.createdAt).toLocaleString() : ''}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
              Refresh Requests
            </button>
            <button
              type="button"
              onClick={() => refreshNotifs()}
              className="theme-toggle"
              aria-label="Refresh recent activity"
              style={{ padding: '6px 10px', fontSize: 12, height: 'auto' }}
              title="Refresh activity"
            >
              Refresh Activity
            </button>
          </div>
        </div>
      </article>

      {/* Two-column layout on wide screens; stacked on small screens */}
      <div
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: '1fr',
        }}
      >
        <section aria-label="All Access Requests" style={{ display: 'grid', gap: 8 }}>
          <header style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>All Access Requests</h2>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', opacity: 0.9 }}>
              Total: {counts?.total ?? (list?.length || 0)} • Pending: {counts?.pending ?? 0} • Approved: {counts?.approved ?? 0}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-secondary)', opacity: 0.9 }}>
              {loadingAll ? 'Loading…' : ''}
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

        <section aria-label="Recent Activity" style={{ display: 'grid', gap: 8 }}>
          <header style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Recent Activity</h2>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', opacity: 0.9 }}>
              {notifUnread} unread
            </span>
            {/* Activity summary quick stats from analytics */}
            <span
              title="Activity summary (by type)"
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                opacity: 0.9,
                marginLeft: 8,
              }}
            >
              {Object.entries(activity?.summary?.byType || {})
                .map(([k, v]) => `${k}: ${v}`)
                .slice(0, 4)
                .join(' • ')}
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => refreshNotifs()}
                className="theme-toggle"
                style={{ padding: '6px 10px', fontSize: 12, height: 'auto' }}
                disabled={notifLoading}
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={() => markAllNotifsRead()}
                className="theme-toggle"
                style={{ padding: '6px 10px', fontSize: 12, height: 'auto' }}
                disabled={notifUnread === 0}
              >
                Mark all as read
              </button>
              <button
                type="button"
                onClick={downloadActivityCSV}
                className="theme-toggle"
                style={{ padding: '6px 10px', fontSize: 12, height: 'auto' }}
                title="Download audit log CSV"
              >
                Download Audit CSV
              </button>
            </div>
          </header>

          {notifError && (
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
              {notifError?.message || String(notifError)}
            </div>
          )}

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
            {recentNotifs.length === 0 && !notifLoading ? (
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
                No activity yet.
              </div>
            ) : (
              recentNotifs.map((n) => <ActivityItem key={n.id} n={n} />)
            )}
          </div>
        </section>
      </div>

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
