import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

/**
 * PUBLIC_INTERFACE
 * NDAModal
 *
 * A UI-only modal to stub the NDA Signing experience.
 * Fields:
 * - Full Name
 * - Email (prefilled from auth if available)
 * - Company
 * - Checkbox to accept NDA terms (required to enable "Sign NDA")
 *
 * Behavior:
 * - No backend calls; submit handler is stubbed and logs data to console.
 * - Press Escape or click backdrop to close.
 *
 * Props:
 * - isOpen: boolean — controls visibility
 * - onClose: () => void — called when closing
 * - onSign?: (payload) => void — optional callback for mock-sign completion
 */
export default function NDAModal({
  isOpen = false,
  onClose = () => {},
  onSign = () => {},
}) {
  const { user } = useAuth();
  const initialEmail = useMemo(() => user?.email || '', [user?.email]);

  const [form, setForm] = useState({
    fullName: '',
    email: initialEmail,
    company: '',
    accept: false,
  });

  useEffect(() => {
    // Reset when opened to reflect current user email
    if (isOpen) {
      setForm((prev) => ({ ...prev, email: user?.email || '' }));
    }
  }, [isOpen, user?.email]);

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
    if (!form.accept) return;
    const payload = { ...form, signedAt: new Date().toISOString() };
    // eslint-disable-next-line no-console
    console.log('[NDAModal] signed payload:', payload);
    onSign(payload);
    onClose();
  }

  function stopProp(e) {
    e.stopPropagation();
  }

  const disabled = !form.fullName || !form.email || !form.accept;

  return (
    <>
      {/* Backdrop */}
      <div
        role="button"
        aria-label="Close NDA modal"
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
        aria-labelledby="nda-modal-title"
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
            maxWidth: 620,
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
            <h2 id="nda-modal-title" style={{ margin: 0, fontSize: 18 }}>
              Non-Disclosure Agreement (NDA)
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

          {/* Simulated NDA content preview */}
          <div
            style={{
              padding: '0.9rem 1rem',
              borderBottom: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
            }}
          >
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.45 }}>
              This is a UI-only preview of the NDA. In a later step, we will integrate a proper
              e-signature flow (e.g., DocuSign) and store signed copies securely.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{ padding: '1rem', display: 'grid', gap: 12 }}
            aria-label="NDA signing form"
          >
            <div style={{ display: 'grid', gap: 6 }}>
              <label htmlFor="fullName" style={{ fontWeight: 600 }}>
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Your full legal name"
                value={form.fullName}
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
              <label htmlFor="email" style={{ fontWeight: 600 }}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                value={form.email}
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
              <label htmlFor="company" style={{ fontWeight: 600 }}>
                Company
              </label>
              <input
                id="company"
                name="company"
                type="text"
                placeholder="Your company name (optional)"
                value={form.company}
                onChange={handleChange}
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

            <label
              htmlFor="accept"
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
                id="accept"
                name="accept"
                type="checkbox"
                checked={form.accept}
                onChange={handleChange}
              />
              <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                I have read and accept the NDA terms.
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
                disabled={disabled}
                aria-busy={false}
                className="btn-primary"
                style={{
                  paddingInline: 16,
                  fontWeight: 600,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.85 : 1,
                }}
              >
                Sign NDA
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
