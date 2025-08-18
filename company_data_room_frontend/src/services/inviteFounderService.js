import { supabase } from './supabaseClient';

/**
 * PUBLIC_INTERFACE
 * inviteUserAsFounder
 *
 * Invites a user with the 'founder' role via Supabase Auth magic link.
 * Assumes caller is admin; the invited user will be created with metadata.roles=['founder'].
 * Due to supabase-js v2 limitation on role metadata injection (from client), we:
 *   1. Invite using signInWithOtp for email
 *   2. If user exists, attempt to update their roles to add 'founder'
 * Returns { success, error }
 */
export async function inviteUserAsFounder(email, siteUrl) {
  if (!email || !email.includes('@')) {
    return { success: false, error: 'Please provide a valid email.' };
  }
  if (!supabase) {
    return { success: false, error: 'Supabase client not configured.' };
  }

  // Step 1: Send invite (magic link) - meta workaround: update after
  let inviteResp = await supabase.auth.signInWithOtp({
    email: email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: siteUrl || window.location.origin
    }
  });

  if (inviteResp.error && inviteResp.error.message && !/User already registered/i.test(inviteResp.error.message)) {
    return { success: false, error: inviteResp.error.message };
  }

  // Wait briefly—sometimes takes a moment for new user to become available
  await new Promise((r) => setTimeout(r, 1200));

  // Step 2: Find user by email (need admin API for metadata, but limited in FE)
  // Try calling a secured RPC (your Supabase backend should provide this for real app)
  let setRoleResp = await supabase.rpc('set_user_roles_by_email', {
    email,
    roles: ['founder']
  });

  if (setRoleResp.error) {
    // Unable to set metadata—may require admin to finish in backend
    return { success: false, error: "Invite sent, but failed to set founder role: " + setRoleResp.error.message };
  }

  // Success! User invited and their roles updated.
  return { success: true, error: null };
}


/**
 * Securely assigns a role (e.g., 'founder', 'admin') to a user after invite/signup using the Supabase admin API.
 * To be called ONLY from secure backend or admin-protected UI contexts. (NOT from general client-side code.)
 *
 * PUBLIC_INTERFACE
 * @param {string} userId
 * @param {string[]} roles - Typically ['founder'] or ['admin']
 * @returns {Promise<boolean>}
 */
export async function assignFounderRole(userId, roles = ["founder"]) {
  // Only callable from trusted/authed backend context, not public.
  try {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      app_metadata: { roles },
    });
    if (error) {
      console.error("Error setting founder/admin roles for user:", userId, error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Exception in assignFounderRole:", e);
    return false;
  }
}
