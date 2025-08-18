import { useCallback, useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { useAuth } from "../context/AuthContext";

/**
 * PUBLIC_INTERFACE
 * Custom hook to fetch company documents with upload/delete controls gated by roles.
 *
 * Fetches by tier (public/qualified/nda). Returns list, loading flag, errors,
 * and methods to refresh, upload, remove, and get signed file URLs.
 * Upload/delete allowed for founder or admin only.
 *
 * @param {string} initialTier - initial document tier to display ('public', 'qualified', or 'nda')
 */
const useDocuments = (initialTier = "public") => {
  const [tier, setTier] = useState(initialTier);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { hasAnyRole } = useAuth();

  // Fetch documents by tier
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase.from("documents").select("*");
    if (tier) {
      query = query.eq("tier", tier);
    }
    query = query.order("created_at", { ascending: false });
    const { data, error } = await query;
    if (error) {
      setError(error);
      setItems([]);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }, [tier]);

  useEffect(() => {
    refresh();
  }, [refresh, tier]);

  // Upload a document (founder/admin only)
  // opts: {tier, name, tags}
  const uploadDocument = async (file, opts = {}) => {
    if (!(hasAnyRole && hasAnyRole(["founder", "admin"]))) {
      return { data: null, error: { message: "Not authorized" } };
    }
    if (!file) {
      return { data: null, error: { message: "No file provided" } };
    }
    const bucket = process.env.REACT_APP_SUPABASE_DOCS_BUCKET;
    const uploadPath = (opts.name || file.name).replace(/\s+/g, "_");
    // Metadata: Pass tier/tags if supported in your backend/storage rules/schema
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(`${opts.tier || tier}/${uploadPath}`, file, {
        cacheControl: "3600",
        upsert: false,
        ...(opts.tags ? { metadata: { tags: opts.tags.join(",") } } : {})
      });
    if (error) return { data: null, error };
    // Optionally, insert into a metadata table
    await refresh();
    return { data, error: null };
  };

  // Delete a document (founder/admin only)
  const removeDocument = async (path) => {
    if (!(hasAnyRole && hasAnyRole(["founder", "admin"]))) {
      return { error: { message: "Not authorized" } };
    }
    const bucket = process.env.REACT_APP_SUPABASE_DOCS_BUCKET;
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (!error) {
      await refresh();
    }
    return { error };
  };

  // Helper: get signed URL for document (used for secure viewing)
  const getSignedUrl = async (path, expiresIn = 300) => {
    const bucket = process.env.REACT_APP_SUPABASE_DOCS_BUCKET;
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
    return { signedUrl: data?.signedUrl || null, error };
  };

  return {
    items,
    loading,
    error,
    refresh,
    uploadDocument,
    removeDocument,
    getSignedUrl,
    setTier // For adjustable tier navigation from UI (if needed)
  };
};

export default useDocuments;
