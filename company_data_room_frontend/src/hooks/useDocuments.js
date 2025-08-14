import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

/**
 * Internal constants and utilities
 */
const DEFAULT_BUCKET = process.env.REACT_APP_SUPABASE_DOCS_BUCKET || 'documents';
const VALID_TIERS = ['public', 'qualified', 'nda'];

/**
 * Validate and normalize a tier string.
 * @param {string} tier
 * @returns {'public'|'qualified'|'nda'|null}
 */
function normalizeTier(tier) {
  if (!tier) return null;
  const t = String(tier).toLowerCase();
  return VALID_TIERS.includes(t) ? t : null;
}

/**
 * Create a human-friendly document model from table record or storage item.
 */
function toDocumentModel({ source, tier, record, item, prefix }) {
  if (source === 'table') {
    const r = record || {};
    return {
      id: r.id ?? r.path ?? `${tier}/${r.name ?? ''}`,
      name: r.name ?? r.filename ?? r.path?.split('/').pop() ?? 'untitled',
      path: r.path ?? `${tier}/${r.name ?? r.filename ?? 'file'}`,
      tier,
      contentType: r.content_type ?? r.mime_type ?? null,
      size: typeof r.size === 'number' ? r.size : null,
      createdAt: r.created_at ?? r.inserted_at ?? null,
      updatedAt: r.updated_at ?? null,
      owner: r.owner ?? r.owner_id ?? null,
      storageItem: null,
      tableRecord: r,
    };
  }

  // storage item
  const i = item || {};
  const path = `${prefix}/${i.name}`;
  // Supabase storage list v2 returns metadata in "metadata" and timestamps such as updated_at
  return {
    id: path,
    name: i.name ?? 'file',
    path,
    tier,
    contentType: i.metadata?.mimetype ?? null,
    size: typeof i.metadata?.size === 'number' ? i.metadata.size : null,
    createdAt: i.created_at ?? null,
    updatedAt: i.updated_at ?? i.last_accessed_at ?? null,
    owner: null,
    storageItem: i,
    tableRecord: null,
  };
}

/**
 * Generate a unique storage path for uploads, preserving the original extension.
 */
function makeUniquePath(tier, filename) {
  const safeTier = normalizeTier(tier) || 'public';
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const dot = filename.lastIndexOf('.');
  const base = dot > -1 ? filename.substring(0, dot) : filename;
  const ext = dot > -1 ? filename.substring(dot) : '';
  const cleanBase = base.replace(/[^\w\-]+/g, '_').slice(0, 80);
  return `${safeTier}/${ts}_${rand}_${cleanBase}${ext}`;
}

/**
 * Try to detect if a table missing error has occurred.
 */
function isTableMissingError(error) {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  return msg.includes('does not exist') || msg.includes('relation') && msg.includes('does not exist');
}

/**
 * Try an operation and swallow errors (return null) — useful for optional metadata insert.
 */
async function tryOrNull(promiseFactory) {
  try {
    return await promiseFactory();
  } catch {
    return null;
  }
}

/**
 * Map a bucket list response to document items.
 */
function mapListToDocs(listData, tier, prefix) {
  const files = Array.isArray(listData) ? listData : [];
  // Only include files (skip subfolders). In Supabase v2, folders have type === 'folder'
  return files
    .filter((i) => !i.id || i.id) // keep all; SDK may or may not include id
    .filter((i) => i && i.name && i.type !== 'folder')
    .map((i) => toDocumentModel({ source: 'storage', tier, item: i, prefix }));
}

/**
 * PUBLIC_INTERFACE
 * useDocuments
 *
 * A React hook to manage company document metadata and storage objects backed by Supabase.
 * Provides:
 * - list-by-tier (from metadata table "documents" if present; falls back to Supabase Storage directory listing)
 * - file upload (founder/admin-only) with automatic unique pathing and optional metadata insert
 * - signed URL retrieval for secure inline viewing
 * - loading and error states
 *
 * Environment variables:
 * - REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_KEY (required by supabaseClient)
 * - REACT_APP_SUPABASE_DOCS_BUCKET (optional; defaults to "documents")
 *
 * Tiers supported:
 * - "public", "qualified", "nda"
 *
 * Returns:
 * {
 *   items,              // Document[]
 *   loading,            // boolean
 *   error,              // Error | null
 *   canUpload,          // boolean (founder or admin)
 *   bucket,             // string
 *   refresh,            // () => Promise<void>
 *   uploadDocument,     // (file: File, opts?: { tier?: string, name?: string }) => Promise<{ data, error }>
 *   removeDocument,     // (path: string) => Promise<{ error: Error | null }>
 *   getSignedUrl,       // (path: string, expiresIn?: number) => Promise<{ signedUrl: string | null, error: Error | null }>
 * }
 */
export default function useDocuments(initialTier = 'public') {
  const { user, hasAnyRole } = useAuth();
  const tier = useMemo(() => normalizeTier(initialTier) || 'public', [initialTier]);
  const bucket = DEFAULT_BUCKET;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const canUpload = useMemo(() => {
    return Boolean(hasAnyRole?.(['founder', 'admin']));
  }, [hasAnyRole]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!supabase) {
        // Supabase not configured; show empty list with a soft error
        const softError = new Error('Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.');
        if (mountedRef.current) {
          setItems([]);
          setError(softError);
        }
        return;
      }

      // First attempt: metadata table ("documents"). If missing or blocked, fall back to storage listing.
      try {
        const { data, error: tableErr } = await supabase
          .from('documents')
          .select('*')
          .eq('tier', tier)
          .order('created_at', { ascending: false });

        if (tableErr) {
          if (isTableMissingError(tableErr)) {
            // Fall back to storage listing
          } else {
            // Permission or other issues: still try fallback, but capture error
            if (process.env.NODE_ENV !== 'production') {
              // eslint-disable-next-line no-console
              console.warn('[useDocuments] documents table error:', tableErr.message);
            }
          }
        } else if (Array.isArray(data)) {
          const docs = data.map((r) => toDocumentModel({ source: 'table', tier, record: r }));
          if (mountedRef.current) {
            setItems(docs);
            setLoading(false);
          }
          return;
        }
      } catch (tErr) {
        // Unexpected error from table query; proceed with a fallback.
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn('[useDocuments] table query threw:', tErr);
        }
      }

      // Fallback: storage listing by tier folder
      const prefix = tier;
      const { data: listData, error: listError } = await supabase.storage.from(bucket).list(prefix, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      });

      if (listError) {
        throw listError;
      }

      const docs = mapListToDocs(listData, tier, prefix);
      if (mountedRef.current) {
        setItems(docs);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [bucket, tier]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // PUBLIC_INTERFACE
  const uploadDocument = useCallback(
    /**
     * Upload a File into the storage bucket under the current tier (or provided tier).
     * Only founder/admin can upload.
     *
     * @param {File} file - The file to upload
     * @param {{ tier?: string, name?: string }} [opts]
     * @returns {Promise<{ data: any, error: Error | null }>}
     */
    async (file, opts = {}) => {
      const targetTier = normalizeTier(opts.tier) || tier;
      const desiredName = opts.name || file?.name || 'file';

      if (!file || !(file instanceof File)) {
        return { data: null, error: new Error('No file provided for upload.') };
      }

      if (!canUpload) {
        return { data: null, error: new Error('You do not have permission to upload documents.') };
      }

      if (!supabase) {
        return {
          data: null,
          error: new Error('Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.'),
        };
      }

      try {
        const path = makeUniquePath(targetTier, desiredName);
        const { data, error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });

        if (uploadError) {
          return { data: null, error: uploadError };
        }

        // Optionally insert metadata into "documents" table (if present), ignore failures silently
        await tryOrNull(async () => {
          await supabase.from('documents').insert({
            name: desiredName,
            path,
            tier: targetTier,
            content_type: file.type || null,
            size: file.size || null,
            owner: user?.id ?? null,
          });
        });

        // Refresh list to reflect the new upload
        await refresh();

        return { data, error: null };
      } catch (e) {
        return { data: null, error: e };
      }
    },
    [bucket, canUpload, refresh, tier, user?.id]
  );

  // PUBLIC_INTERFACE
  const removeDocument = useCallback(
    /**
     * Remove a document by its storage path (founder/admin only).
     * Attempts to delete metadata from "documents" table as well (non-fatal if missing/fails).
     *
     * @param {string} path - Full storage path (e.g., "public/123_file.pdf")
     * @returns {Promise<{ error: Error | null }>}
     */
    async (path) => {
      if (!path) return { error: new Error('Path is required.') };
      if (!canUpload) return { error: new Error('You do not have permission to delete documents.') };
      if (!supabase) {
        return {
          error: new Error('Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.'),
        };
      }
      try {
        const { error: delError } = await supabase.storage.from(bucket).remove([path]);
        if (delError) return { error: delError };

        // Best-effort metadata delete
        await tryOrNull(async () => {
          await supabase.from('documents').delete().eq('path', path);
        });

        await refresh();
        return { error: null };
      } catch (e) {
        return { error: e };
      }
    },
    [bucket, canUpload, refresh]
  );

  // PUBLIC_INTERFACE
  const getSignedUrl = useCallback(
    /**
     * Create a signed URL for secure viewing/download of a document.
     * @param {string} path - Storage path
     * @param {number} [expiresIn=300] - Expiration in seconds (default 5 minutes)
     * @returns {Promise<{ signedUrl: string | null, error: Error | null }>}
     */
    async (path, expiresIn = 300) => {
      if (!path) return { signedUrl: null, error: new Error('Path is required.') };
      if (!supabase) {
        return {
          signedUrl: null,
          error: new Error('Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.'),
        };
      }
      try {
        const { data, error: urlError } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
        if (urlError) return { signedUrl: null, error: urlError };
        return { signedUrl: data?.signedUrl ?? null, error: null };
      } catch (e) {
        return { signedUrl: null, error: e };
      }
    },
    [bucket]
  );

  return {
    items,
    loading,
    error,
    canUpload,
    bucket,
    refresh,
    uploadDocument,
    removeDocument,
    getSignedUrl,
  };
}
