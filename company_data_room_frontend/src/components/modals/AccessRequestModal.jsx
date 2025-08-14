import React, { useEffect, useMemo, useState } from 'react';
import useRequests from '../../hooks/useRequests';

/**
 * PUBLIC_INTERFACE
 * AccessRequestModal
 *
 * A modal for investors to request access to higher-tier materials, wired to the useRequests hook.
 *
 * Behavior:
 * - Renders as a centered dialog with a dark translucent backdrop.
 * - Pressing Escape or clicking the backdrop closes the modal via onClose.
 * - Submit handler calls useRequests().submitRequest with { tier, organization, notes, qualified }.
 *
 * Props:
 * - isOpen: boolean — controls visibility
 * - onClose: () => void — called to close the modal
 * - onSubmit?: (payload | { data, error }) => void — optional callback after submit attempt
 */
export default function AccessRequestModal({
  isOpen = false,
  onClose = () => {},
  onSubmit = null,
}) {
  const { canSubmit, submitting, errorSubmit, submitRequest } = useRequests();

  const [form, setForm] = useState({
    tier: 'qualified',
    organization: '',
    notes: '',
    qualified: false,
  });

  // reset when opened
  useEffect(() => {
    if (isOpen) {
      setForm((prev) => ({ ...prev }));
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Compute submit capability via hook before any early return to satisfy Rules of Hooks.
  const canClickSubmit = useMemo(() => {
    return Boolean(form.organization) && canSubmit && !submitting;
  }, [form.organization, canSubmit, submitting]);

  if (!isOpen) return null;

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canClickSubmit) return;

    const payload = {
      tier: form.tier,
      organization: form.organization,
      notes: form.notes,
      qualified: form.qualified,
    };
    const { data, error } = await submitRequest(payload);

    // Allow parent to react (e.g., toast)
    if (typeof onSubmit === 'function') {
      try {
        onSubmit({ data, error, payload });
      } catch {
        // ignore consumer errors
      }
    }

    if (!error) {
      onClose();
    }
  }

  function stopProp(e) {
    e.stopPropagation();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        role="button"
        aria-label="Close access request modal"
        tabIndex={0}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 100,
        }}
      />

      {/* Dialog */}
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="access-modal-title"
        onClick={stopProp}
        style={{
          position: 'fixed',
          zIndex: 101,
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          padding: '1rem',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 560,
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 12,
            boxShadow: '0 12px 24px rgba(0,0,0,0.35)',
            overflow: 'hidden',
          }}
        >
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderBottom: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
            }}
          >
            <h2 id="access-modal-title" style={{ margin: 0, fontSize: 18 }}>
              Request Access
            </h2>
            <span style={{ marginLeft: 'auto' }} />
            <button
              type="button"
              onClick={onClose}
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
          </header>

          <form onSubmit={handleSubmit} style={{ padding: '1rem', display: 'grid', gap: 12 }}>
            {!canSubmit && (
              <div
                role="note"
                style={{
                  color: 'var(--text-primary)',
                  background: 'rgba(255,147,88,0.10)',
                  border: '1px solid rgba(255,147,88,0.35)',
                  borderRadius: 10,
                  padding: '8px 10px',
                  fontSize: 13,
                }}
              >
                You currently don’t have permission to submit access requests. Please sign in as an
                Investor or contact the administrator.
              </div>
            )}

            <div style={{ display: 'grid', gap: 6 }}>
              <label htmlFor="tier" style={{ fontWeight: 600 }}>
                Access Tier
              </label>
              <select
                id="tier"
                name="tier"
                value={form.tier}
                onChange={handleChange}
                disabled={submitting}
                style={{
                  padding: '0.6rem 0.7rem',
                  borderRadius: 8,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              >
                <option value="public">Public</option>
                <option value="qualified">Qualified Investor</option>
                <option value="nda">NDA Tier</option>
              </select>
            </div>

            <div style={{ display: 'grid', gap: 6 }}>
              <label htmlFor="organization" style={{ fontWeight: 600 }}>
                Organization
              </label>
              <input
                id="organization"
                name="organization"
                type="text"
                placeholder="Your firm or company"
                value={form.organization}
                onChange={handleChange}
                required
                disabled={submitting}
                style={{
                  padding: '0.6rem 0.7rem',
                  borderRadius: 8,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'grid', gap: 6 }}>
              <label htmlFor="notes" style={{ fontWeight: 600 }}>
                Reason / Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={4}
                placeholder="Tell us briefly why you need access."
                value={form.notes}
                onChange={handleChange}
                disabled={submitting}
                style={{
                  padding: '0.6rem 0.7rem',
                  borderRadius: 8,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            <label
              htmlFor="qualified"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 4,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                id="qualified"
                name="qualified"
                type="checkbox"
                checked={form.qualified}
                onChange={handleChange}
                disabled={submitting}
              />
              <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                I confirm I am a Qualified Investor (for applicable tiers).
              </span>
            </label>

            {errorSubmit && (
              <div
                role="alert"
                style={{
                  color: 'var(--text-primary)',
                  background: 'rgba(220, 53, 69, 0.12)',
                  border: '1px solid rgba(220, 53, 69, 0.3)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 13,
                }}
              >
                {errorSubmit?.message || String(errorSubmit)}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: 10,
                justifyContent: 'flex-end',
                marginTop: 4,
                borderTop: '1px solid var(--border-color)',
                paddingTop: 12,
              }}
            >
              <button
                type="button"
                onClick={onClose}
                aria-label="Cancel"
                className="theme-toggle"
                disabled={submitting}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: 'none',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={!canClickSubmit}
                aria-busy={submitting}
                style={{
                  paddingInline: 16,
                  fontWeight: 600,
                  opacity: canClickSubmit ? 1 : 0.85,
                }}
              >
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
