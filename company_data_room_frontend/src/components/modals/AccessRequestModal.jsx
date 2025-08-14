import React, { useEffect, useState } from 'react';

/**
 * PUBLIC_INTERFACE
 * AccessRequestModal
 *
 * A presentational (UI-only) modal for investors to request access to higher-tier materials.
 * This component is styled with the KAVIA brand tokens (see App.css) and contains sample fields:
 * - Access Tier (select)
 * - Organization (text)
 * - Reason/Notes (textarea)
 * - Qualified Investor (checkbox)
 *
 * Behavior:
 * - Renders as a centered dialog with a dark translucent backdrop.
 * - Pressing Escape or clicking the backdrop closes the modal via onClose.
 * - Submit handler is stubbed; it prevents default and calls onSubmit with sample data.
 *
 * Props:
 * - isOpen: boolean — controls visibility
 * - onClose: () => void — called to close the modal
 * - onSubmit?: (payload) => void — optional stubbed submit callback
 */
export default function AccessRequestModal({
  isOpen = false,
  onClose = () => {},
  onSubmit = () => {},
}) {
  const [form, setForm] = useState({
    tier: 'qualified',
    organization: '',
    notes: '',
    qualified: false,
  });

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    // Stub: In a future step, connect to backend/service
    const payload = { ...form, submittedAt: new Date().toISOString() };
    // eslint-disable-next-line no-console
    console.log('[AccessRequestModal] submit payload:', payload);
    onSubmit(payload);
    onClose();
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
            <div style={{ display: 'grid', gap: 6 }}>
              <label htmlFor="tier" style={{ fontWeight: 600 }}>
                Access Tier
              </label>
              <select
                id="tier"
                name="tier"
                value={form.tier}
                onChange={handleChange}
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
              />
              <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                I confirm I am a Qualified Investor (for applicable tiers).
              </span>
            </label>

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
                style={{ paddingInline: 16, fontWeight: 600 }}
              >
                Submit Request
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
