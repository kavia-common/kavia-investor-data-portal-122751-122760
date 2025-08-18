import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

/**
 * PUBLIC_INTERFACE
 * UploadForm
 *
 * Simple uploader for founders/admins to upload a document into a selected tier.
 * Supports:
 * - File selection
 * - Optional custom display name (defaults to original file name)
 * - Tier select: public / qualified / nda
 * - Optional tags (comma separated); passed through to backend metadata if available
 *
 * Props:
 * - defaultTier?: 'public' | 'qualified' | 'nda' (default: 'public')
 * - onUpload: (file: File, opts: { tier?: string, name?: string, tags?: string[] }) => Promise<{ data, error }>
 * - onUploaded?: () => void — callback after successful upload (e.g., refresh list)
 * - disabled?: boolean — disables inputs/buttons
 */
export default function UploadForm({ defaultTier = 'public', onUpload, onUploaded = () => {}, disabled = false }) {
  const { hasAnyRole, roleClaims } = useAuth();
  // Defensive: only founders/admins allowed!
  const roleAllowed =
    hasAnyRole
      ? hasAnyRole(['founder', 'admin'])
      : (roleClaims?.founder === true || roleClaims?.admin === true);
  const realDisabled = disabled || !roleAllowed;

  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [tier, setTier] = useState(defaultTier);
  const [tags, setTags] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(() => {
    return Boolean(file) && !busy && !realDisabled;
  }, [file, busy, realDisabled]);

  function parseTags(str) {
    if (!str) return [];
    return String(str)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20);
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f && !name) {
      setName(f.name);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file || typeof onUpload !== 'function') return;
    setBusy(true);
    try {
      const opts = {
        tier,
        name: name || file.name || 'file',
        tags: parseTags(tags),
      };
      const { error } = await onUpload(file, opts);
      if (error) {
        // eslint-disable-next-line no-alert
        alert(error?.message || 'Failed to upload file.');
        return;
      }
      // Reset and notify
      setFile(null);
      setName('');
      setTags('');
      onUploaded();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Upload document"
      style={{
        display: 'grid',
        gap: 10,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 12,
        padding: '0.9rem',
        opacity: realDisabled ? 0.6 : 1
      }}
    >
      <h3 style={{ margin: 0, fontSize: 16 }}>Upload a document</h3>
      {!roleAllowed && (
        <div
          role="alert"
          style={{
            color: 'var(--danger)',
            background: 'rgba(220, 53, 69, 0.09)',
            border: '1px solid rgba(220, 53, 69, 0.18)',
            borderRadius: 8,
            padding: '10px 10px 6px 10px',
            marginBottom: 8,
          }}
        >
          Only founders or admins can upload documents.
        </div>
      )}

      <div style={{ display: 'grid', gap: 6 }}>
        <label htmlFor="file" style={{ fontWeight: 600 }}>
          File
        </label>
        <input
          id="file"
          name="file"
          type="file"
          onChange={handleFileChange}
          disabled={realDisabled || busy}
          style={{
            padding: '0.4rem 0.5rem',
            borderRadius: 8,
            border: '1px solid var(--border-color)',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <label htmlFor="name" style={{ fontWeight: 600 }}>
          Display name (optional)
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="e.g., Financials Q2.pdf"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={realDisabled || busy}
          style={{
            padding: '0.6rem 0.7rem',
            borderRadius: 8,
            border: '1px solid var(--border-color)',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <label htmlFor="tier" style={{ fontWeight: 600 }}>
          Tier
        </label>
        <select
          id="tier"
          name="tier"
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          disabled={realDisabled || busy}
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
          <option value="nda">NDA</option>
        </select>
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <label htmlFor="tags" style={{ fontWeight: 600 }}>
          Tags (optional, comma separated)
        </label>
        <input
          id="tags"
          name="tags"
          type="text"
          placeholder="e.g., financials, 2024, board"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          disabled={realDisabled || busy}
          style={{
            padding: '0.6rem 0.7rem',
            borderRadius: 8,
            border: '1px solid var(--border-color)',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={() => {
            setFile(null);
            setName('');
            setTags('');
          }}
          className="theme-toggle"
          disabled={realDisabled || busy}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: 'none',
          }}
        >
          Reset
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={!canSubmit}
          aria-busy={busy}
          style={{ paddingInline: 16, fontWeight: 600, opacity: canSubmit ? 1 : 0.85 }}
        >
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </div>
    </form>
  );
}
