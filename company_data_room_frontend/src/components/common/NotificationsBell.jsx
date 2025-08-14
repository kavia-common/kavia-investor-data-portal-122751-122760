import React, { useEffect, useMemo, useState } from 'react';

/**
 * PUBLIC_INTERFACE
 * NotificationsBell renders a bell icon with an unread badge and toggles a right-side
 * notifications drawer using static placeholder data. This is a UI-only scaffold to be
 * replaced by a real notifications system in a later step.
 *
 * Behavior:
 * - Shows a badge with the number of unread notifications (computed from dummy data).
 * - Clicking the bell toggles a drawer. Clicking the backdrop or pressing Escape closes it.
 * - "Mark all as read" updates local state to set all notifications as read.
 *
 * Accessibility:
 * - The bell button is a 44x44 touch target with appropriate ARIA attributes.
 * - The drawer is an aside with role="complementary" and labelled by its title.
 */
export default function NotificationsBell() {
  // Static placeholder notifications (dummy data)
  const [items, setItems] = useState([
    {
      id: 'n1',
      title: 'Access granted',
      body: 'Your NDA was approved. You can now view Tier 3 documents.',
      time: '2h ago',
      read: false,
      tier: 'NDA',
    },
    {
      id: 'n2',
      title: 'New document uploaded',
      body: 'Founder uploaded “Financials Q2”.',
      time: '1d ago',
      read: false,
      tier: 'Qualified',
    },
    {
      id: 'n3',
      title: 'Update: Company teaser',
      body: 'A new version of the company teaser is available.',
      time: '3d ago',
      read: true,
      tier: 'Public',
    },
  ]);

  const [open, setOpen] = useState(false);
  const unreadCount = useMemo(() => items.filter((i) => !i.read).length, [items]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  function toggleDrawer() {
    setOpen((v) => !v);
  }

  function markAllRead() {
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  }

  function closeDrawer() {
    setOpen(false);
  }

  // Small badge element
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

  // Item renderer with KAVIA styling
  function NotificationItem({ item }) {
    const leftBarColor = item.read ? 'transparent' : 'var(--brand-primary)';
    const opacity = item.read ? 0.85 : 1;

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
            <span
              style={{
                fontSize: 11,
                padding: '2px 6px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text-secondary)',
              }}
            >
              {item.tier}
            </span>
            <span
              aria-label="time"
              style={{
                marginLeft: 'auto',
                fontSize: 12,
                color: 'var(--text-muted)',
                opacity: 0.9,
                whiteSpace: 'nowrap',
              }}
            >
              {item.time}
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
        >
          {/* Bell icon */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M14.5 18.5a2.5 2.5 0 1 1-5 0"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
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
      {open && <div className="notif-backdrop" onClick={closeDrawer} role="button" aria-label="Close notifications" tabIndex={0} />}

      {/* Drawer */}
      <aside
        className={`notif-drawer ${open ? 'open' : ''}`}
        role="complementary"
        aria-labelledby="notif-title"
      >
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
          <h2
            id="notif-title"
            style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}
          >
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
              onClick={markAllRead}
              className="theme-toggle"
              style={{
                padding: '6px 10px',
                fontSize: 12,
                height: 'auto',
              }}
            >
              Mark all as read
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
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
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
          {items.length === 0 ? (
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
            items.map((item) => <NotificationItem key={item.id} item={item} />)
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
