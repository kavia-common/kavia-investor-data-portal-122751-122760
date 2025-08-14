import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

/**
 * PUBLIC_INTERFACE
 * Custom hook to fetch company documents with optional filtering.
 * Example usage: const { documents, loading, error } = useDocuments({ tier: "tier_2" });
 *
 * @param {Object} params
 * @param {string} params.tier - Optional. Filter by tier, e.g. "tier_1" for public.
 * @param {string} params.userId - Optional. Filter by uploader.
 * @param {boolean} params.publicOnly - If true, only gets public (tier 1) docs.
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
      // Force fetch only tier_1 public docs; ignore tier param.
      query = query.eq("tier", "tier_1");
    } else if (tier) {
      query = query.eq("tier", tier);
    }
    if (userId) {
      query = query.eq("uploader_id", userId);
    }

    query
      .order("uploaded_at", { ascending: false })
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
