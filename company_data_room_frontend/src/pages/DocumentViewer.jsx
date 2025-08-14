import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { WatermarkOverlay, getWatermarkText } from '../util/watermark';

/**
 * PUBLIC_INTERFACE
 * DocumentViewer
 *
 * Secure inline viewer for a company document stored in Supabase Storage.
 * - Extracts the Storage path from the URL (:id param, URL-encoded).
 * - Requests a short-lived signed URL from Supabase (default 5 minutes).
 * - Renders PDFs inline (object/iframe) and basic videos with no-download controls.
 * - Adds a watermark for NDA-tier documents: user's email + timestamp (stub overlay).
 * - Includes basic deterrents for download/print (not foolproof).
 *
 * Parameters (route):
 * - :id — URL-encoded storage path, e.g., "nda%2F1718_abc_File.pdf"
 *
 * Env:
 * - REACT_APP_SUPABASE_DOCS_BUCKET (optional; defaults to "documents")
 * - REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_KEY configured in the app.
 *
 * Returns:
 * - JSX section with toolbar and inline viewer.
 */
export default function DocumentViewer() {
  const { id } = useParams();
  const { user } = useAuth();

  const bucket = process.env.REACT_APP_SUPABASE_DOCS_BUCKET || 'documents';

  const storagePath = useMemo(() => {
    try {
      return decodeURIComponent(id || '');
    } catch {
      return id || '';
    }
  }, [id]);

  const tier = useMemo(() => {
    if (!storagePath) return null;
    const parts = String(storagePath).split('/');
    return (parts[0] || '').toLowerCase();
  }, [storagePath]);

  const isNDA = tier === 'nda';

  const extension = useMemo(() => {
    if (!storagePath) return '';
    const p = storagePath.toLowerCase();
    const dot = p.lastIndexOf('.');
    return dot > -1 ? p.substring(dot + 1) : '';
  }, [storagePath]);

  const kind = useMemo(() => {
    // quick mime guess from extension
    if (['pdf'].includes(extension)) return 'pdf';
    if (['mp4', 'webm', 'ogg'].includes(extension)) return 'video';
    return 'other';
  }, [extension]);

  const [viewerUrl, setViewerUrl] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const fetchSignedUrl = useCallback(async () => {
    setBusy(true);
    setError(null);
    setViewerUrl('');
    try {
      if (!supabase) {
        throw new Error(
          'Supabase is not configured. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.'
        );
      }
      if (!storagePath) throw new Error('Invalid document path.');

      const { data, error: urlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, 60 * 5); // 5 minutes

      if (urlError) throw urlError;

      let url = data?.signedUrl || '';
      if (kind === 'pdf') {
        // Attempt to hide viewer UI in some browsers (not a guarantee)
        const hideUiParams = '#toolbar=0&navpanes=0&scrollbar=0';
        url += hideUiParams;
      }
      setViewerUrl(url);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }, [bucket, kind, storagePath]);

  useEffect(() => {
    fetchSignedUrl();
  }, [fetchSignedUrl]);

  // Basic deterrents (not foolproof): block context menu and Ctrl/Cmd+P
  useEffect(() => {
    function onKeyDown(e) {
      const key = e.key?.toLowerCase();
      if (key === 'p' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    function onContext(e) {
      e.preventDefault();
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('contextmenu', onContext);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('contextmenu', onContext);
    };
  }, []);

  const watermarkText = useMemo(() => {
    return isNDA ? getWatermarkText(user?.email || '') : '';
  }, [isNDA, user?.email]);

  function Viewer() {
    if (!viewerUrl) return null;

    const commonContainerStyle = {
      position: 'relative',
      width: '100%',
      height: '70vh',
      minHeight: 420,
      border: '1px solid var(--border-color)',
      borderRadius: 12,
      overflow: 'hidden',
      background: 'var(--bg-secondary)',
    };

    if (kind === 'pdf') {
      return (
        <div style={commonContainerStyle}>
          {isNDA && <WatermarkOverlay text={watermarkText} />}
          <object
            data={viewerUrl}
            type="application/pdf"
            width="100%"
            height="100%"
            // Prevent focus-based actions and right-clicks on overlay layer
            onContextMenu={(e) => e.preventDefault()}
          >
            <iframe
              title="PDF Viewer"
              src={viewerUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              referrerPolicy="no-referrer"
              onContextMenu={(e) => e.preventDefault()}
            />
          </object>
          {/* Overlay to reduce easy interaction with embedded toolbar */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
            }}
          />
        </div>
      );
    }

    if (kind === 'video') {
      return (
        <div style={commonContainerStyle}>
          {isNDA && <WatermarkOverlay text={watermarkText} />}
          <video
            src={viewerUrl}
            controls
            style={{ width: '100%', height: '100%', display: 'block' }}
            controlsList="nodownload noplaybackrate noremoteplayback"
            disablePictureInPicture
            onContextMenu={(e) => e.preventDefault()}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // Generic fallback: iframe render
    return (
      <div style={commonContainerStyle}>
        {isNDA && <WatermarkOverlay text={watermarkText} />}
        <iframe
          title="Document Viewer"
          src={viewerUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          referrerPolicy="no-referrer"
          sandbox="" // most generic; if content fails to load, remove sandbox or add allowances as needed
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
    );
  }

  return (
    <section
      aria-label="Document Viewer"
      onContextMenu={(e) => e.preventDefault()}
      style={{
        display: 'grid',
        gap: '0.75rem',
        alignContent: 'start',
        padding: '1rem',
        color: 'var(--text-primary)',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link
          to="/documents"
          aria-label="Back to documents"
          style={{
            textDecoration: 'none',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            padding: '6px 10px',
          }}
        >
          ← Back
        </Link>
        <div style={{ overflow: 'hidden' }}>
          <h1 className="title" style={{ margin: 0 }}>
            Document Viewer
          </h1>
          <p className="description" style={{ opacity: 0.85, marginTop: 6, fontSize: 14 }}>
            {storagePath ? storagePath.split('/').slice(1).join('/') : 'Unknown file'}
          </p>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.75 }}>
          Tier: {tier ? tier.toUpperCase() : 'N/A'}
        </span>
      </header>

      {busy && (
        <div
          aria-busy="true"
          aria-live="polite"
          style={{
            color: 'var(--text-secondary)',
            fontSize: 14,
            opacity: 0.9,
          }}
        >
          Preparing secure viewer…
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

      {!busy && !error && <Viewer />}

      {/* Small note about download deterrents */}
      <div style={{ fontSize: 12, opacity: 0.6 }}>
        Note: For sensitive content we use short-lived signed URLs and apply basic UI restrictions.
        Determined users may still capture content; request access as needed to audit trail.
      </div>
    </section>
  );
}
