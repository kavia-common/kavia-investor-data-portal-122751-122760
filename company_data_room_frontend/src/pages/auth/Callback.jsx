import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

/**
 * PUBLIC_INTERFACE
 * AuthCallback
 *
 * Handles the Supabase auth callback (magic link / OAuth) and redirects the user.
 * On success: redirects to "/dashboard"
 * On error: redirects to "/auth/error" with a query parameter.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState('Processing authentication…');

  useEffect(() => {
    let active = true;
    async function run() {
      try {
        if (!supabase) {
          setMessage('Supabase is not configured. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.');
          navigate('/login', { replace: true });
          return;
        }

        // getSessionFromUrl will parse the URL hash/code and set the session
        const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
        if (error) {
          // Preserve error message minimally in URL for debugging
          navigate(`/auth/error?m=${encodeURIComponent(error.message || 'auth_error')}`, { replace: true });
          return;
        }

        if (active) {
          // Optionally restore original target if provided
          const params = new URLSearchParams(location.search);
          const next = params.get('next') || '/dashboard';
          navigate(next, { replace: true });
        }
      } catch (e) {
        navigate('/auth/error?m=unexpected', { replace: true });
      }
    }

    run();
    return () => {
      active = false;
    };
  }, [navigate, location.search]);

  return (
    <section
      aria-label="Auth callback"
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
          padding: '1.25rem',
          textAlign: 'center',
        }}
      >
        <h1 className="title" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
          Signing you in…
        </h1>
        <p className="description" style={{ margin: 0, opacity: 0.85 }}>{message}</p>
      </div>
    </section>
  );
}
