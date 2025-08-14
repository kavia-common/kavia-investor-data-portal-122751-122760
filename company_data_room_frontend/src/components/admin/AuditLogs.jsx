import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../services/supabaseClient';

/**
 * PUBLIC_INTERFACE
 * AuditLogs
 *
 * Admin widget that displays the audit/activity log and supports CSV export.
 *
 * Data source (best-effort):
 * - public.audit_logs (optional table; UI degrades gracefully if missing)
 *   Suggested columns:
 *    - id uuid primary key
 *    - action text               -- e.g., 'document_view', 'request_approved'
 *    - entity_type text          -- e.g., 'document', 'request', 'user'
 *    - entity_id text/uuid
 *    - actor_user_id uuid
 *    - actor_email text
 *    - target_user_id uuid?
 *    - target_email text?
 *    - metadata jsonb
 *    - created_at timestamptz default now()
 *
 * Behavior:
 * - If Supabase not configured or table missing/RLS, renders empty with a friendly state.
 * - Provides local search and CSV export of visible rows.
 */

function toAuditModel(r) {
  if (!r || typeof r !== 'object') return null;
  return {
    id: r.id ?? null,
    action: r.action ?? r.type ?? 'event',
    entityType: r.entity_type ?? r.entityType ?? null,
    entityId: r.entity_id ?? r.entityId ?? null,
    actorUserId: r.actor_user_id ?? r.user_id ?? null,
    actorEmail: r.actor_email ?? r.email ?? null,
    targetUserId: r.target_user_id ?? null,
    targetEmail: r.target_email ?? null,
    metadata: r.metadata ?? null,
    createdAt: r.created_at ?? r.inserted_at ?? null,
    raw: r,
  };
}

function isTableMissingError(error) {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  return msg.includes('does not exist') || (msg.includes('relation') && msg.includes('does not exist'));
}

// CSV helper
function downloadCSV(filename, header, rows) {
  const csvEscape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return `"${s}"`;
  };
  const csv =
    `${header.map(csvEscape).join(',')}\n` +
    rows.map((row) => row.map(csvEscape).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// PUBLIC_INTERFACE
export default function AuditLogs() {
  /**
   * Renders an audit log viewer with search and CSV export.
   */
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!supabase) {
        const soft = new Error('Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.');
        if (mountedRef.current) setError(soft);
        return;
      }
      const { data, error: qError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (qError) {
        if (!isTableMissingError(qError)) {
          if (mountedRef.current) setError(qError);
        }
        if (mountedRef.current) setItems([]);
        return;
      }

      const mapped = (Array.isArray(data) ? data : []).map(toAuditModel).filter(Boolean);
      if (mountedRef.current) setItems(mapped);
    } catch (e) {
      if (mountedRef.current) setError(e);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const visible = useMemo(() => {
    const s = String(search || '').trim().toLowerCase();
    if (!s) return items;
    return items.filter((row) => {
      const hay = [
        row.id,
        row.action,
        row.entityType,
        row.entityId,
        row.actorUserId,
        row.actorEmail,
        row.targetUserId,
        row.targetEmail,
        row.createdAt,
        row.metadata ? JSON.stringify(row.metadata) : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(s);
    });
  }, [items, search]);

  const exportCSV = useCallback(() => {
    const header = [
      'id',
      'created_at',
      'action',
      'entity_type',
      'entity_id',
      'actor_user_id',
      'actor_email',
      'target_user_id',
      'target_email',
      'metadata',
    ];
    const rows = visible.map((r) => [
      r.id,
      r.createdAt || '',
      r.action || '',
      r.entityType || '',
      r.entityId || '',
      r.actorUserId || '',
      r.actorEmail || '',
      r.targetUserId || '',
      r.targetEmail || '',
      r.metadata ? JSON.stringify(r.metadata) : '',
    ]);
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    downloadCSV(`kavia_audit_logs_${ts}.csv`, header, rows);
  }, [visible]);

  return (
    <section aria-label="Audit Logs" style={{ display: 'grid', gap: 8 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Audit Logs</h2>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', opacity: 0.9 }}>
          Showing {visible.length} of {items.length}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="search"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search audit logs"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              padding: '6px 10px',
              minWidth: 200,
            }}
          />
          <button
            type="button"
            onClick={refresh}
            className="theme-toggle"
            aria-label="Refresh audit logs"
            style={{ padding: '6px 10px', fontSize: 12, height: 'auto' }}
            title="Refresh audit logs"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={exportCSV}
            className="theme-toggle"
            aria-label="Export audit logs CSV"
            style={{ padding: '6px 10px', fontSize: 12, height: 'auto' }}
            title="Export audit logs as CSV"
          >
            Export CSV
          </button>
        </div>
      </header>

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
        {loading && (
          <div aria-busy="true" style={{ color: 'var(--text-secondary)', fontSize: 14, opacity: 0.9 }}>
            Loading audit logs…
          </div>
        )}
        {!loading && visible.length === 0 && (
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
            No audit events found.
          </div>
        )}
        {visible.map((row) => (
          <div
            key={row.id}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <strong
                  style={{
                    fontSize: 14,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={`${row.action || 'event'} • ${row.entityType || ''} • ${row.entityId || ''}`}
                >
                  {row.action || 'event'} • {row.entityType || ''} • {row.entityId || ''}
                </strong>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
                  {row.createdAt ? new Date(row.createdAt).toLocaleString() : ''}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'grid', gap: 4 }}>
                <span>
                  Actor: {row.actorEmail || row.actorUserId || 'unknown'}
                  {row.targetEmail || row.targetUserId ? ` → Target: ${row.targetEmail || row.targetUserId}` : ''}
                </span>
                {row.metadata && (
                  <span title={JSON.stringify(row.metadata)}>
                    Details: {JSON.stringify(row.metadata)}
                  </span>
                )}
              </div>
            </div>
            <div />
          </div>
        ))}
      </div>
    </section>
  );
}
