import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

// PUBLIC_INTERFACE
export default function Login() {
  /**
   * Login page for initiating Supabase magic link authentication.
   *
   * Displays:
   * - Email input field
   * - "Send Magic Link" button
   * - Basic success/error messaging
   *
   * Behavior:
   * - Calls AuthContext.loginWithMagicLink(email) on submit
   * - Disables the button while the request is in-flight
   * - Shows success message when email is sent, otherwise shows error
   *
   * Env dependencies (managed through AuthProvider):
   * - REACT_APP_SUPABASE_URL
   * - REACT_APP_SUPABASE_KEY
   * - REACT_APP_SITE_URL (optional; used for redirect in magic link)
   */
  const { loginWithMagicLink } = useAuth();

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ type: 'idle', message: '' }); // idle | loading | success | error

  const isValidEmail = (value) => /\S+@\S+\.\S+/.test(value);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setStatus({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    setStatus({ type: 'loading', message: '' });
    try {
      const { error } = await loginWithMagicLink(email);
      if (error) {
        setStatus({
          type: 'error',
          message:
            error?.message ||
            'Failed to send magic link. Please verify your email or try again later.',
        });
        return;
      }
      setStatus({
        type: 'success',
        message:
          'Magic link sent! Please check your inbox and follow the link to sign in.',
      });
    } catch (err) {
      setStatus({
        type: 'error',
        message:
          err?.message ||
          'An unexpected error occurred. Please try again.',
      });
    }
  }

  const disabled = status.type === 'loading' || !isValidEmail(email);

  return (
    <section
      aria-label="Login page"
      style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '60vh',
        color: 'var(--text-primary)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          padding: '1.5rem',
          boxSizing: 'border-box',
          boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
        }}
      >
        <header style={{ marginBottom: '1rem' }}>
          <h1 className="title" style={{ margin: 0, fontSize: 24 }}>
            Sign in
          </h1>
          <p className="description" style={{ margin: '0.5rem 0 0', opacity: 0.8 }}>
            Enter your email to receive a one-time magic link.
          </p>
        </header>

        <form onSubmit={handleSubmit} aria-label="Magic link login form">
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <label htmlFor="email" style={{ textAlign: 'left', fontWeight: 600 }}>
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                padding: '0.75rem 0.9rem',
                borderRadius: 8,
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />

            <button
              type="submit"
              disabled={disabled}
              aria-busy={status.type === 'loading'}
              className="theme-toggle"
              style={{
                width: '100%',
                marginTop: '0.5rem',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.85 : 1,
              }}
            >
              {status.type === 'loading' ? 'Sending…' : 'Send Magic Link'}
            </button>
          </div>
        </form>

        {status.type === 'success' && (
          <div
            role="status"
            aria-live="polite"
            style={{
              marginTop: '1rem',
              padding: '0.75rem',
              borderRadius: 8,
              background: 'rgba(0, 128, 0, 0.1)',
              border: '1px solid rgba(0, 128, 0, 0.3)',
              color: 'var(--text-primary)',
              textAlign: 'left',
            }}
          >
            {status.message}
          </div>
        )}

        {status.type === 'error' && (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              marginTop: '1rem',
              padding: '0.75rem',
              borderRadius: 8,
              background: 'rgba(220, 53, 69, 0.1)',
              border: '1px solid rgba(220, 53, 69, 0.3)',
              color: 'var(--text-primary)',
              textAlign: 'left',
            }}
          >
            {status.message}
          </div>
        )}

        <footer style={{ marginTop: '1rem', opacity: 0.7, fontSize: 12, textAlign: 'left' }}>
          By continuing, you agree to receive a sign-in link at the provided email.
        </footer>
      </div>
    </section>
  );
}
