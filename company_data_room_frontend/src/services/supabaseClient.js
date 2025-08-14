import { createClient } from '@supabase/supabase-js';

/**
 * PUBLIC_INTERFACE
 * Supabase client initialization for the KAVIA Investor Data Room frontend.
 *
 * Reads Supabase configuration from environment variables:
 *  - REACT_APP_SUPABASE_URL  — Supabase project URL
 *  - REACT_APP_SUPABASE_KEY  — Supabase anon public key
 *
 * Exports:
 *  - supabase: initialized client instance if variables are present, otherwise null
 *  - getSupabaseOrThrow(): returns the client or throws a descriptive error if not configured
 *
 * Usage:
 *  import { supabase, getSupabaseOrThrow } from '../services/supabaseClient';
 *  const client = getSupabaseOrThrow();
 *  const { data, error } = await client.from('table').select('*');
 */
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;

let client = null;

// Initialize only when both variables exist to avoid runtime errors in non-configured environments.
if (supabaseUrl && supabaseKey) {
  client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    // Optional global headers/metadata for diagnostics
    global: {
      headers: {
        'X-Client-Info': 'company-data-room-frontend',
      },
    },
  });
} else {
  // Warn during development if env vars are missing; avoid crashing imports/tests.
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(
      '[supabase] Missing REACT_APP_SUPABASE_URL and/or REACT_APP_SUPABASE_KEY. Supabase client not initialized.'
    );
  }
}

// PUBLIC_INTERFACE
export const supabase = client;

// PUBLIC_INTERFACE
export function getSupabaseOrThrow() {
  /** Returns the Supabase client if configured; otherwise throws a descriptive error. */
  if (!client) {
    throw new Error(
      'Supabase is not configured. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY in your .env.'
    );
  }
  return client;
}
