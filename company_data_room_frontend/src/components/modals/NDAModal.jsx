import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import useNDA, { NDA_STATUS } from '../../hooks/useNDA';

/**
 * PUBLIC_INTERFACE
 * NDAModal
 *
 * A modal that launches and monitors the NDA signing flow using the useNDA() hook.
 *
 * Features:
 * - Collects user info (name, email, company) and consent checkbox.
 * - Calls initiateNDA() to start the signing ceremony.
 * - Handles signing URLs (opens a new tab by default and also shows a "Continue signing" button).
 * - Displays current NDA status and error messages.
 * - Offers simple polling hook integration to reflect status updates if backend is connected.
 *
 * Props:
 * - isOpen: boolean — controls visibility
 * - onClose: () => void — called when closing
 * - autoOpenSigningWindow?: boolean — whether to automatically open the signing URL in a new tab (default: true)
 */
export default function NDAModal({
  isOpen = false,
  onClose = () => {},
  autoOpenSigningWindow = true,
}) {
  const { user } = useAuth();
  const {
    ndaStatus,
    latestAgreement,
    initiateNDA,
    pollStatus,
    canAccessNDATier,
  } = useNDA();

  const initialEmail = useMemo(() => user?.email || '', [user?.email]);

  const [form, setForm] = useState({
    fullName: '',
    email: initialEmail,
    company: '',
    accept: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [localStatus, setLocalStatus] = useState(NDA_STATUS.NOT_STARTED);

  // Keep a reference to stop the polling when closing the modal
  const pollControllerRef = useRef(null);

  useEffect(() => {
    // Reset when opened to reflect current user email
    if (isOpen) {
      setForm((prev) => ({ ...prev, email: user?.email || '' }));
      setErrorMsg('');
      setIsSubmitting(false);
      setLocalStatus(ndaStatus || NDA_STATUS.NOT_STARTED);
    } else {
      // Stop polling if modal closes
      if (pollControllerRef.current?.stop) {
        pollControllerRef.current.stop();
        pollControllerRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user?.email]);

  // Keep localStatus in sync with hook's status when it changes externally
  useEffect(() => {
    setLocalStatus(ndaStatus || NDA_STATUS.NOT_STARTED);
  }, [ndaStatus]);

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

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.accept) return;
    setErrorMsg('');
    setIsSubmitting(true);

    const payload = {
      fullName: String(form.fullName || '').trim(),
      email: String(form.email || '').trim(),
      company: String(form.company || '').trim(),
    };

    const { data, error } = await initiateNDA(payload);
    setIsSubmitting(false);

    if (error) {
      setErrorMsg(error?.message || String(error));
      return;
    }

    if (data?.signingUrl) {
      // Open signing URL in a new tab (default behavior can be disabled via prop)
      try {
        if (autoOpenSigningWindow) {
          window.open(data.signingUrl, '_blank', 'noopener,noreferrer');
        }
      } catch {
        // ignore window open errors (popup blockers etc.)
      }
    }

    // Start polling status for this agreement
    if (data?.id) {
      if (pollControllerRef.current?.stop) {
        pollControllerRef.current.stop();
      }
      pollControllerRef.current = pollStatus(data.id, {
        intervalMs: 4000,
        timeoutMs: 300000,
        onUpdate: (status /*, agreement */) => {
          setLocalStatus(status || NDA_STATUS.PENDING_SIGNATURE);
        },
      });
    }
  }

  function stopProp(e) {
    e.stopPropagation();
  }

  const disabled = isSubmitting || !form.fullName || !form.email || !form.accept;

  const statusMeta = getStatusMeta(localStatus);

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
            maxWidth: 640,
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

            {/* Status pill */}
            <span
              title={`NDA status: ${statusMeta.label}`}
              style={{
                marginLeft: 'auto',
                fontSize: 12,
                padding: '4px 8px',
                borderRadius: 999,
                background: statusMeta.bg,
                color: statusMeta.fg,
                border: `1px solid ${statusMeta.border}`,
              }}
            >
              {statusMeta.label}
            </span>

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
                marginLeft: 8,
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

          {/* Info strip */}
          <div
            style={{
              padding: '0.9rem 1rem',
              borderBottom: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.45 }}>
              Complete the NDA to access sensitive documents. Your current access:{' '}
              <strong>{canAccessNDATier ? 'NDA tier enabled' : 'NDA required'}</strong>.
            </p>
            {latestAgreement?.signingUrl && localStatus === NDA_STATUS.PENDING_SIGNATURE && (
              <a
                href={latestAgreement.signingUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  marginLeft: 'auto',
                  fontSize: 13,
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: 'rgba(0, 87, 184, 0.15)',
                  color: '#9bc3ff',
                  border: '1px solid rgba(0, 87, 184, 0.35)',
                  textDecoration: 'none',
                }}
              >
                Continue signing
              </a>
            )}
          </div>

          {/* Error message */}
          {errorMsg && (
            <div
              role="alert"
              style={{
                background: 'rgba(255, 0, 0, 0.08)',
                borderBottom: '1px solid rgba(255,0,0,0.25)',
                color: '#ffb3b3',
                padding: '0.65rem 1rem',
                fontSize: 13,
              }}
            >
              {String(errorMsg)}
            </div>
          )}

          {/* Completed message */}
          {localStatus === NDA_STATUS.COMPLETED ? (
            <div style={{ padding: '1rem', display: 'grid', gap: 12 }}>
              <p style={{ margin: 0 }}>
                Your NDA has been recorded. You may now close this dialog and access NDA-protected
                content.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" onClick={onClose} className="btn-primary">
                  Close
                </button>
              </div>
            </div>
          ) : (
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                />
                <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                  I have read and accept the NDA terms.
                </span>
              </label>

              {/* Actions */}
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
                  disabled={isSubmitting}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: 'none',
                    opacity: isSubmitting ? 0.8 : 1,
                  }}
                >
                  Cancel
                </button>
                {latestAgreement?.signingUrl && localStatus === NDA_STATUS.PENDING_SIGNATURE && (
                  <a
                    href={latestAgreement.signingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      paddingInline: 12,
                      textDecoration: 'none',
                    }}
                  >
                    Continue signing
                    <OpenIcon />
                  </a>
                )}
                <button
                  type="submit"
                  disabled={disabled}
                  aria-busy={isSubmitting}
                  className="btn-primary"
                  style={{
                    paddingInline: 16,
                    fontWeight: 600,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.85 : 1,
                  }}
                >
                  {isSubmitting ? 'Starting…' : localStatus === NDA_STATUS.PENDING_SIGNATURE ? 'Re-send/Start' : 'Sign NDA'}
                </button>
              </div>

              {/* Helper note for mock provider */}
              {latestAgreement?.provider === 'mock' && latestAgreement?.signingUrl && (
                <p style={{ margin: 0, marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                  Note: Using mock signing URL for development. In production, this will launch the e-sign provider.
                </p>
              )}
            </form>
          )}
        </div>
      </section>
    </>
  );
}

function getStatusMeta(status) {
  switch (status) {
    case NDA_STATUS.PENDING_SIGNATURE:
      return {
        label: 'Pending signature',
        bg: 'rgba(255, 215, 0, 0.10)',
        fg: '#ffe388',
        border: 'rgba(255, 215, 0, 0.35)',
      };
    case NDA_STATUS.COMPLETED:
      return {
        label: 'Completed',
        bg: 'rgba(46, 204, 113, 0.12)',
        fg: '#b6f2cd',
        border: 'rgba(46, 204, 113, 0.35)',
      };
    case NDA_STATUS.DECLINED:
      return {
        label: 'Declined',
        bg: 'rgba(255, 0, 0, 0.12)',
        fg: '#ffb3b3',
        border: 'rgba(255, 0, 0, 0.35)',
      };
    case NDA_STATUS.ERROR:
      return {
        label: 'Error',
        bg: 'rgba(255, 0, 0, 0.12)',
        fg: '#ffb3b3',
        border: 'rgba(255, 0, 0, 0.35)',
      };
    case NDA_STATUS.INITIATED:
      return {
        label: 'Initiated',
        bg: 'rgba(0, 87, 184, 0.12)',
        fg: '#9bc3ff',
        border: 'rgba(0, 87, 184, 0.35)',
      };
    case NDA_STATUS.NOT_STARTED:
    default:
      return {
        label: 'Not started',
        bg: 'rgba(255,255,255,0.09)',
        fg: '#dbe6ff',
        border: 'rgba(255,255,255,0.15)',
      };
  }
}

function OpenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M14 3h7v7m0-7L10 14m-1-4H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-5"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
