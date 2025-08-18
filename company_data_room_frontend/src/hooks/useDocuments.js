import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

/**
 * PUBLIC_INTERFACE
 * Custom hook to fetch company documents with optional filtering.
 * Example usage: const { documents, loading, error } = useDocuments({ tier: "public" });
 *
 * Params:
 * - tier?: 'public' | 'qualified' | 'nda' — filter by document tier
 * - userId?: string — filter by uploader id (if your schema supports uploader_id)
 * - publicOnly?: boolean — if true, enforce 'public' tier regardless of tier param
 *
 * Notes:
 * - This hook assumes the documents table schema defined in assets/supabase.md,
 *   which includes created_at/updated_at timestamps (no 'uploaded_at' column).
 */
const useDocuments = ({ tier, userId, publicOnly } = {}) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    let query = supabase.from("documents").select("*");

    if (publicOnly) {
      // Force fetch only 'public' docs; ignore tier param.
      query = query.eq("tier", "public");
    } else if (tier) {
      query = query.eq("tier", tier);
    }
    if (userId) {
      query = query.eq("uploader_id", userId);
    }

    // Order by created_at to match the documented schema
    query
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          setError(error);
        } else {
          setDocuments(data || []);
        }
        setLoading(false);
      });
  }, [tier, userId, publicOnly]);

  return { documents, loading, error };
};

export default useDocuments;
