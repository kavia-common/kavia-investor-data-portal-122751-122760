import { supabase } from './supabaseClient';

/**
 * Checks if any users exist with 'admin' in their roles metadata (app_metadata or user_metadata).
 * Returns true if at least one admin, false otherwise.
 */
export async function anyAdminUsersExist() {
  // Query all users via the admin API (requires service_role, or do via Edge Function for production)
  // In the frontend, we -- by security -- cannot list users unless logged in as service admin, so fallback:
  // We try to select ourselves from 'users' (as RLS allows), and infer from roles. Not perfect, but for first-user we assume no admins.
  // If user already exists with admin, RLS should allow them to see themselves.
  // For development/demo: open all users table (NOT for production)
  let { data, error } = await supabase.rpc('get_admin_count', {}); // Prefer using EdgeFn/SQL Function if deployed

  // Fallback: Try to select users from Auth.admin if no RPC exists (should fail in browser)
  if (error || !data) {
    // No SQL fn deployed; we'll guess using a profile table if you have one, or just return false to allow first user as admin
    return false;
  }
  return (data && data[0]?.count > 0);
}

/**
 * Returns a metadata object suitable for passing to the signup function, with roles set to ['admin'] if first user.
 */
export async function getSignupMetadataWithAdminIfFirstUser(base = {}) {
  const adminExists = await anyAdminUsersExist();
  if (!adminExists) {
    return { ...base, roles: ['admin'] };
  }
  return base;
}
