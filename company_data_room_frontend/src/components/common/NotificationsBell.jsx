import React, { useEffect, useMemo, useState } from 'react';
import useNotifications from '../../hooks/useNotifications';

/**
 * PUBLIC_INTERFACE
 * NotificationsBell
 *
 * Renders a bell icon with unread badge and a right-side drawer listing notifications
 * from Supabase (via useNotifications). Supports realtime updates, mark all as read,
 * and shows status for access-request-related notifications.
 */
export default function NotificationsBell() {
  const { items, unreadCount, loading, error, markAllRead, markRead, refresh } = useNotifications();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function toggleDrawer() {
    setOpen((v) => !v);
  }
  function closeDrawer() {
    setOpen(false);
  }

  async function doMarkAll() {
    setBusy(true);
    try {
      await markAllRead();
    } finally {
      setBusy(false);
    }
  }

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

  function StatusChip({ notif }) {
    const status = notif?.metadata?.status ? String(notif.metadata.status).toLowerCase() : null;
    if (!status) return null;
    const map = {
      approved: '#31C48D',
      denied: '#dc3545',
      revoked: '#b02a37',
      withdrawn: '#6c757d',
      pending: '#F4B25A',
    };
    const color = map[status] || 'var(--text-secondary)';
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

  function TierChip({ notif }) {
    const tier = notif?.metadata?.tier ? String(notif.metadata.tier).toUpperCase() : null;
    if (!tier) return null;
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
        title={`Tier: ${tier}`}
      >
        {tier}
      </span>
    );
  }

  const sortedItems = useMemo(() => {
    return [...(items || [])].sort((a, b) => {
      const tA = new Date(a.createdAt || 0).getTime();
      const tB = new Date(b.createdAt || 0).getTime();
      return tB - tA;
    });
  }, [items]);

  function Badge({ count = 0 }) {
    if (!count) return null;
    return (
      <span
        aria-label={`${count} unread notifications`}
        style={{
          position: 'absolute',
          top: 4,
          right: 4,
          minWidth: 18,
          height: 18,
          padding: '0 5px',
          borderRadius: 999,
          backgroundColor: 'var(--brand-primary)',
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.35)',
          lineHeight: 1,
        }}
      >
        {count > 99 ? '99+' : String(count)}
      </span>
    );
  }

  function NotificationItem({ item }) {
    const isUnread = String(item.status || '').toLowerCase() === 'unread';
    const leftBarColor = isUnread ? 'var(--brand-primary)' : 'transparent';
    const opacity = isUnread ? 1 : 0.9;

    return (
      <div
        role="listitem"
        tabIndex={0}
        aria-label={`${item.title}. ${item.body}`}
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
            markRead(item.id);
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
              title={item.title}
            >
              {item.title}
            </strong>
            <TierChip notif={item} />
            <StatusChip notif={item} />
            <span
              aria-label="time"
              style={{
                marginLeft: 'auto',
                fontSize: 12,
                color: 'var(--text-muted)',
                opacity: 0.9,
                whiteSpace: 'nowrap',
              }}
              title={item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
            >
              {toRelativeTime(item.createdAt)}
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
            {item.body}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={toggleDrawer}
          aria-label="Open notifications"
          aria-haspopup="dialog"
          aria-expanded={open}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            minWidth: 44,
            minHeight: 44,
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            color: 'var(--text-primary)',
            cursor: 'pointer',
            position: 'relative',
          }}
          title={unreadCount ? `${unreadCount} unread notifications` : 'Notifications'}
        >
          {/* Bell icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14.5 18.5a2.5 2.5 0 1 1-5 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path
              d="M4.5 17h15l-1.6-2.4a6 6 0 0 1-1-3.3V9.1a4.9 4.9 0 1 0-9.8 0v2.2c0 1.2-.34 2.36-1 3.37L4.5 17Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <Badge count={unreadCount} />
        </button>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="notif-backdrop"
          onClick={closeDrawer}
          role="button"
          aria-label="Close notifications"
          tabIndex={0}
          title="Close"
        />
      )}

      {/* Drawer */}
      <aside className={`notif-drawer ${open ? 'open' : ''}`} role="complementary" aria-labelledby="notif-title">
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 14px',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-primary)',
            position: 'sticky',
            top: 0,
            zIndex: 1,
          }}
        >
          <h2 id="notif-title" style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>
            Notifications
          </h2>
          <span
            aria-label="Unread count"
            style={{
              marginLeft: 6,
              fontSize: 12,
              color: 'var(--text-secondary)',
              opacity: 0.9,
            }}
          >
            {unreadCount} unread
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => refresh()}
              className="theme-toggle"
              style={{ padding: '6px 10px', fontSize: 12, height: 'auto' }}
              disabled={loading}
              title="Refresh notifications"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={doMarkAll}
              className="theme-toggle"
              style={{ padding: '6px 10px', fontSize: 12, height: 'auto' }}
              disabled={busy || unreadCount === 0}
              title="Mark all as read"
            >
              {busy ? 'Working…' : 'Mark all as read'}
            </button>
            <button
              type="button"
              onClick={closeDrawer}
              aria-label="Close"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 34,
                height: 34,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </header>

        <section
          role="list"
          aria-label="Notifications list"
          style={{
            display: 'grid',
            gap: 10,
            padding: 12,
          }}
        >
          {error && (
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
              {error?.message || String(error)}
            </div>
          )}
          {sortedItems.length === 0 && !loading ? (
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
              No notifications yet.
            </div>
          ) : (
            sortedItems.map((item) => <NotificationItem key={item.id} item={item} />)
          )}
        </section>

        <footer
          style={{
            marginTop: 'auto',
            padding: '12px 14px',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-primary)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              // Placeholder action
              closeDrawer();
            }}
            className="theme-toggle"
            style={{
              width: '100%',
              padding: '10px 12px',
              fontWeight: 600,
            }}
          >
            View all
          </button>
        </footer>
      </aside>
    </>
  );
}
