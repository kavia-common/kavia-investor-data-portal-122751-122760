import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import useDocuments from '../hooks/useDocuments';
import DocumentList from '../components/documents/DocumentList';
import UploadForm from '../components/documents/UploadForm';
import { useNavigate } from 'react-router-dom';

/**
 * PUBLIC_INTERFACE
 * Documents
 *
 * Tiered documents list with secure click-to-view and (for founders/admins)
 * an upload form that refreshes the list on success.
 *
 * - Uses useDocuments(tier) to fetch items from metadata table or storage fallback.
 * - Click-to-view navigates to an inline viewer route where a short-lived signed URL is fetched.
 * - Founders/admins can upload/delete; investors get read-only access.
 */
export default function Documents() {
  const { roleClaims } = useAuth();
  const navigate = useNavigate();

  const [selectedTier, setSelectedTier] = useState('public');

  // Data binding for current tier
  const {
    items,
    loading,
    error,
    canUpload,
    refresh,
    uploadDocument,
    removeDocument,
    getSignedUrl,
  } = useDocuments(selectedTier);

  const tiers = useMemo(
    () => [
      { key: 'public', label: 'Public' },
      { key: 'qualified', label: 'Qualified' },
      { key: 'nda', label: 'NDA' },
    ],
    []
  );

  function TierTabs() {
    return (
      <div
        role="tablist"
        aria-label="Document tiers"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
      >
        {tiers.map((t) => {
          const active = selectedTier === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedTier(t.key)}
              className="theme-toggle"
              style={{
                padding: '8px 12px',
                background: active ? 'var(--button-bg)' : 'transparent',
                border: active ? 'none' : '1px solid rgba(255,255,255,0.1)',
                boxShadow: active ? 'var(--shadow-button-primary)' : 'none',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <section
      aria-label="Documents"
      style={{
        display: 'grid',
        gap: '0.75rem',
        alignContent: 'start',
        padding: '1rem',
        color: 'var(--text-primary)',
      }}
    >
      <header style={{ display: 'grid', gap: 8 }}>
        <h1 className="title" style={{ margin: 0 }}>Documents</h1>
        <p className="description" style={{ opacity: 0.85, marginTop: 0 }}>
          Visible to: Investor, Founder, Admin
        </p>
        <TierTabs />
      </header>

      {canUpload && (
        <UploadForm
          defaultTier={selectedTier}
          onUpload={(file, opts) => uploadDocument(file, opts)}
          onUploaded={refresh}
        />
      )}

      <DocumentList
        tier={selectedTier}
        items={items}
        loading={loading}
        error={error}
        canUpload={canUpload}
        onRefresh={refresh}
        onRemove={removeDocument}
        getSignedUrl={getSignedUrl}
        onOpenDocument={(doc) => {
          // Navigate to the inline viewer with URL-encoded storage path
          const encodedPath = encodeURIComponent(doc?.path || '');
          if (encodedPath) {
            navigate(`/documents/${encodedPath}`);
          }
        }}
      />

      <footer style={{ fontSize: 14, opacity: 0.8 }}>
        <strong>Your roles:</strong>{' '}
        {Array.isArray(roleClaims?.roles) && roleClaims.roles.length > 0
          ? roleClaims.roles.join(', ')
          : 'none'}
      </footer>
    </section>
  );
}
