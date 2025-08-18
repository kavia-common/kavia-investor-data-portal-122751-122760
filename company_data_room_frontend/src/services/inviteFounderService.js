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
  // First, try secure Admin API if possible (FE trusted context only)
  let success = false;
  let assignError = null;

  try {
    if (process.env.REACT_APP_SUPABASE_KEY && process.env.REACT_APP_SUPABASE_KEY.startsWith('sbp')) {
      // Search user by email (using admin.listUsers)
      const { data: userList, error: listErr } = await supabase.auth.admin.listUsers();
      if (listErr) throw new Error(listErr.message);
      const userObj = userList?.users?.find((u) => u.email === email);
      if (userObj) {
        // Assign founder/admin role via Admin API
        const assigned = await assignFounderRole(userObj.id, ['founder']);
        success = assigned;
        if (!assigned) assignError = 'Failed to assign founder role via admin API';
      }
    }
  } catch (e) {
    assignError = e.message;
    // fallback to public RPC set_user_roles_by_email
  }

  if (!success) {
    // Try public (or backend-protected) RPC ─ not ideal but fallback if no admin context
    let setRoleResp = await supabase.rpc('set_user_roles_by_email', {
      email,
      roles: ['founder'],
    });
    if (setRoleResp.error) {
      return { success: false, error: "Invite sent, but failed to set founder role: " + setRoleResp.error.message };
    }
  }

  // Success! User invited and their roles updated/admin call worked.
  return { success: true, error: assignError };
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
