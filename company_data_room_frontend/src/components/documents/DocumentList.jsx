import React from 'react';

/**
 * PUBLIC_INTERFACE
 * DocumentList
 *
 * Renders a list of documents for a given tier with KAVIA brand styling.
 * Handles:
 * - Loading and error states
 * - Click-to-view using signed URLs (secure, short-lived)
 * - Optional delete button for founders/admins
 * - Manual refresh action
 *
 * Props:
 * - tier: 'public' | 'qualified' | 'nda' — the current tier label to display
 * - items: Array<{ id, name, path, tier, size, createdAt, contentType }>
 * - loading: boolean
 * - error: Error | null
 * - canUpload?: boolean — whether the user can delete (founder/admin)
 * - onRefresh?: () => Promise<void> — callback to refresh the list
 * - onRemove?: (path: string) => Promise<{ error: Error | null }>
 * - getSignedUrl?: (path: string, expiresIn?: number) => Promise<{ signedUrl: string | null, error: Error | null }>
 * - onOpenDocument?: (item) => void — custom open handler; if not provided, uses getSignedUrl to open in new tab
 */
export default function DocumentList({
  tier = 'public',
  items = [],
  loading = false,
  error = null,
  canUpload = false,
  onRefresh = null,
  onRemove = null,
  getSignedUrl = null,
  onOpenDocument = null,
}) {
  function formatBytes(bytes) {
    if (!bytes && bytes !== 0) return '';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(1024));
    const v = bytes / Math.pow(1024, i);
    return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${sizes[i]}`;
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return String(iso);
    }
  }

  async function handleOpen(item) {
    if (!item) return;
    if (typeof onOpenDocument === 'function') {
      onOpenDocument(item);
      return;
    }
    if (!getSignedUrl) {
      // eslint-disable-next-line no-alert
      alert('Secure viewing is not configured.');
      return;
    }
    const { signedUrl, error: urlError } = await getSignedUrl(item.path, 300);
    if (urlError || !signedUrl) {
      // eslint-disable-next-line no-alert
      alert(urlError?.message || 'Failed to create a secure viewing link.');
      return;
    }
    window.open(signedUrl, '_blank', 'noopener,noreferrer');
  }

  async function handleDelete(path) {
    if (!onRemove || !path) return;
    // Confirm destructive action
    // eslint-disable-next-line no-alert
    const ok = window.confirm('Delete this document? This action cannot be undone.');
    if (!ok) return;
    const { error: delError } = await onRemove(path);
    if (delError) {
      // eslint-disable-next-line no-alert
      alert(delError.message || 'Failed to delete document.');
    }
  }

  return (
    <section
      aria-label={`Documents (${tier})`}
      style={{
        display: 'grid',
        gap: 12,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Documents — {tier.toUpperCase()}</h2>
        <span
          style={{
            marginLeft: 6,
            fontSize: 12,
            color: 'var(--text-secondary)',
            opacity: 0.9,
          }}
        >
          {items?.length || 0} items
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {typeof onRefresh === 'function' && (
            <button
              type="button"
              onClick={onRefresh}
              className="theme-toggle"
              aria-label="Refresh documents"
              style={{ padding: '6px 10px', fontSize: 12, height: 'auto' }}
            >
              Refresh
            </button>
          )}
        </div>
      </header>

      {loading && (
        <div
          aria-busy="true"
          aria-live="polite"
          style={{
            color: 'var(--text-secondary)',
            fontSize: 14,
            opacity: 0.9,
          }}
        >
          Loading documents…
        </div>
      )}

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
        {(items || []).length === 0 && !loading ? (
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
            No documents uploaded in {tier.toUpperCase()} tier yet.
          </div>
        ) : (
          (items || []).map((doc) => (
            <div
              key={doc.id || doc.path}
              role="listitem"
              onClick={() => handleOpen(doc)}
              onKeyDown={(e) => e.key === 'Enter' && handleOpen(doc)}
              tabIndex={0}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: 10,
                background: 'transparent',
                cursor: 'pointer',
              }}
              title="Click to view securely"
            >
              <div style={{ display: 'grid', gap: 3, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    minWidth: 0,
                  }}
                >
                  <strong
                    style={{
                      color: 'var(--text-primary)',
                      fontSize: 14,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {doc.name || doc.path?.split('/').pop() || 'untitled'}
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
                    {doc.contentType || 'file'}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    gap: 10,
                  }}
                >
                  <span>Size: {formatBytes(doc.size)}</span>
                  {doc.createdAt && <span>• Uploaded: {formatDate(doc.createdAt)}</span>}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  className="theme-toggle"
                  style={{ padding: '6px 10px', fontSize: 12 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpen(doc);
                  }}
                >
                  Open
                </button>
                {canUpload && typeof onRemove === 'function' && (
                  <button
                    type="button"
                    aria-label="Delete document"
                    title="Delete document"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(doc.path);
                    }}
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
                      <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path
                        d="M8 6l1-2h6l1 2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
