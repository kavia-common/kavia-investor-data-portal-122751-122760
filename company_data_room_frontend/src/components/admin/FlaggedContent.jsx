import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../services/supabaseClient';

/**
 * PUBLIC_INTERFACE
 * FlaggedContent
 *
 * Admin widget that lists flagged documents/content for review and allows resolving items.
 *
 * Data source (best-effort):
 * - public.flagged_content (optional table; UI degrades gracefully if missing)
 *   Suggested columns:
 *    - id uuid primary key
 *    - document_path text or path text or doc_path text
 *    - reason text
 *    - severity text ('low','medium','high') or integer severity
 *    - status text default 'open' (values 'open','resolved')
 *    - flagged_by uuid/email?
 *    - notes text
 *    - created_at timestamptz default now()
 *    - resolved_at timestamptz null
 *
 * Behavior:
 * - If Supabase or table are missing or RLS restricts access, shows a friendly empty/error state.
 * - Client-side filters for status + severity maintain robustness across schemas.
 */

// Helper: try to standardize incoming row into consistent model
function toFlagModel(r) {
  if (!r || typeof r !== 'object') return null;
  const path = r.document_path || r.path || r.doc_path || r.key || r.slug || null;
  const status = (r.status || 'open').toLowerCase();
  const severityRaw = r.severity ?? r.level ?? r.priority ?? null;
  const severity = typeof severityRaw === 'number' ? String(severityRaw) : String(severityRaw || '').toLowerCase() || null;

  return {
    id: r.id ?? null,
    path,
    reason: r.reason || r.message || r.note || '',
    severity, // e.g., 'low' | 'medium' | 'high' | '1' | '2' | '3'
    status,   // 'open' | 'resolved' | other
    flaggedBy: r.flagged_by || r.actor_user_id || r.user_id || null,
    notes: r.notes || null,
    createdAt: r.created_at || r.inserted_at || null,
    resolvedAt: r.resolved_at || null,
    raw: r,
  };
}

function isTableMissingError(error) {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  return msg.includes('does not exist') || (msg.includes('relation') && msg.includes('does not exist'));
}

// PUBLIC_INTERFACE
export default function FlaggedContent({ defaultStatus = 'open' }) {
  /**
   * Displays a list of flagged content for admin review with a control to resolve items.
   *
   * Props:
   * - defaultStatus?: 'open' | 'resolved' | ''   (initial filter)
   */
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters (client-side to avoid schema coupling)
  const [statusFilter, setStatusFilter] = useState(String(defaultStatus || 'open').toLowerCase());
  const [severityFilter, setSeverityFilter] = useState(''); // '' | 'low' | 'medium' | 'high' | '1'|'2'|'3'

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
        .from('flagged_content')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (qError) {
        if (!isTableMissingError(qError)) {
          // non-fatal: show error but keep UI
          if (mountedRef.current) setError(qError);
        }
        if (mountedRef.current) setItems([]);
        return;
      }

      const mapped = (Array.isArray(data) ? data : []).map(toFlagModel).filter(Boolean);
      if (mountedRef.current) setItems(mapped);
    } catch (e) {
      if (mountedRef.current) setError(e);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const resolveItem = useCallback(async (id) => {
    if (!id) return { error: new Error('Missing id') };
    try {
      if (!supabase) return { error: new Error('Supabase not configured') };
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('flagged_content')
        .update({ status: 'resolved', resolved_at: now })
        .eq('id', id);
      if (error) return { error };
      if (mountedRef.current) {
        setItems((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'resolved', resolvedAt: now } : f)));
      }
      return { error: null };
    } catch (e) {
      return { error: e };
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    let list = items.slice();
    const sf = String(statusFilter || '').toLowerCase();
    if (sf) list = list.filter((i) => String(i.status || '').toLowerCase() === sf);
    const sev = String(severityFilter || '').toLowerCase();
    if (sev) list = list.filter((i) => String(i.severity || '').toLowerCase() === sev);
    return list;
  }, [items, statusFilter, severityFilter]);

  const counts = useMemo(() => {
    const c = { total: items.length, open: 0, resolved: 0 };
    for (const i of items) {
      const s = String(i.status || '').toLowerCase();
      if (s === 'resolved') c.resolved += 1;
      else c.open += 1;
    }
    return c;
  }, [items]);

  return (
    <section aria-label="Flagged Content" style={{ display: 'grid', gap: 8 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Flagged Content</h2>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', opacity: 0.9 }}>
          {counts.open} open • {counts.resolved} resolved • Total: {counts.total}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Status:{' '}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                padding: '6px 8px',
              }}
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
            </select>
          </label>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Severity:{' '}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                padding: '6px 8px',
              }}
            >
              <option value="">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </label>
          <button
            type="button"
            onClick={refresh}
            className="theme-toggle"
            aria-label="Refresh flagged content"
            style={{ padding: '6px 10px', fontSize: 12, height: 'auto' }}
            title="Refresh flagged content"
          >
            Refresh
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
            Loading flagged items…
          </div>
        )}
        {!loading && filtered.length === 0 && (
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
            No flagged content.
          </div>
        )}
        {filtered.map((f) => {
          const isOpen = String(f.status || '').toLowerCase() !== 'resolved';
          const sevBadge = f.severity
            ? String(f.severity).toUpperCase()
            : '';
          const sevColor =
            String(f.severity || '').toLowerCase() === 'high' || String(f.severity) === '3'
              ? '#dc3545'
              : String(f.severity || '').toLowerCase() === 'medium' || String(f.severity) === '2'
              ? '#F4B25A'
              : '#31C48D';
          return (
            <div
              key={f.id || `${f.path}-${f.createdAt || ''}`}
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
                  <strong
                    title={f.path || ''}
                    style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {f.path || 'Unknown path'}
                  </strong>
                  {sevBadge && (
                    <span
                      title={`Severity: ${sevBadge}`}
                      style={{
                        fontSize: 11,
                        padding: '2px 6px',
                        borderRadius: 999,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: sevColor,
                        fontWeight: 700,
                      }}
                    >
                      {sevBadge}
                    </span>
                  )}
                  <span
                    title={`Status: ${String(f.status || '').toUpperCase()}`}
                    style={{
                      fontSize: 11,
                      padding: '2px 6px',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: isOpen ? '#F4B25A' : '#31C48D',
                      fontWeight: 700,
                    }}
                  >
                    {String(f.status || '').toUpperCase()}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
                    {f.createdAt ? new Date(f.createdAt).toLocaleString() : ''}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span>Reason: {f.reason || '-'}</span>
                  {f.notes && <span style={{ marginLeft: 10, opacity: 0.9 }}>• Notes: {f.notes}</span>}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isOpen ? (
                  <button
                    type="button"
                    className="theme-toggle"
                    onClick={() => resolveItem(f.id)}
                    style={{ padding: '6px 10px', fontSize: 12, height: 'auto' }}
                    title="Mark as resolved"
                  >
                    Resolve
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Resolved {f.resolvedAt ? new Date(f.resolvedAt).toLocaleString() : ''}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
