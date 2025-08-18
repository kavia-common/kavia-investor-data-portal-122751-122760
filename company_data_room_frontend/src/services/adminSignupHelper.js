import { supabase } from "./supabaseClient";

/**
 * Checks if this is the first user in the system.
 * If so, sets the app_metadata.roles to ['founder'] or ['admin'] using the Supabase admin API.
 * @param {string} userId
 * @returns {Promise<boolean>} True if promoted, false otherwise.
 *
 * PUBLIC_INTERFACE
 */
export async function promoteFirstUserToAdmin(userId) {
  // Ensure this is only ever run from a secure context with service_role/admin key
  // Do NOT expose this to the client or unauthenticated flows.
  try {
    // Fetch all users securely via Supabase admin API (requires service_role JWT)
    // This operation only works if called in backend/edge, not from browser.
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error("Error fetching users for admin promotion:", error);
      return false;
    }
    if (data && data.users && data.users.length === 1 && data.users[0].id === userId) {
      // First user: securely assign founder role using assignRoles utility
      const { assignRoles } = await import('./inviteFounderService');
      const success = await assignRoles(userId, ['founder']);
      if (!success) {
        console.error("Error setting app_metadata.roles for first user.");
        return false;
      }
      return true;
    }
    return false;
  } catch (e) {
    console.error("Exception during first user promotion:", e);
    return false;
  }
}
