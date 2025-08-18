#!/usr/bin/env node

/**
 * Secure CLI utility for promoting a user to admin in Supabase Auth (app_metadata.roles += 'admin').
 * 
 * Usage:
 *   1. Ensure you have the Supabase Project URL and Service Role Key (with admin privileges).
 *   2. Run: node scripts/promote_user_to_admin.js --email user@example.com
 *      or:  node scripts/promote_user_to_admin.js --id <user-uuid>
 *   3. The script will only run if SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL are set as env vars.
 *
 * SECURITY: 
 *   Use this CLI script ONLY from a secure admin workstation.
 *   Restore/lock down credentials after use.
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// ---- ENVIRONMENT VARIABLES ----
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ---- SECURE CONFIG CHECK ----
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
});

function parseArgs() {
  const args = process.argv.slice(2);
  let email = null;
  let id = null;
  for (let i = 0; i < args.length; ++i) {
    if (args[i] === '--email') email = args[i + 1];
    if (args[i] === '--id') id = args[i + 1];
  }
  return { email, id };
}

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => {
    rl.close();
    resolve(ans);
  }));
}

async function findUser({ email, id }) {
  const filter = email ? { email } : id ? { id } : null;
  if (!filter) return null;
  const { data, error } = await supabase.auth.admin.listUsers({ 
    ...(email ? { email } : {}),
    ...(id ? { user_id: id } : {}),
    page: 1,
    perPage: 1
  });
  if (error || !data || data.users.length === 0) {
    return null;
  }
  return data.users[0];
}

async function promoteUserToAdmin(user) {
  // Find & modify roles in app_metadata
  const app_metadata = user.app_metadata || {};
  let roles = app_metadata.roles || [];
  if (!Array.isArray(roles)) {
    roles = typeof roles === "string" ? [roles] : [];
  }
  if (roles.includes('admin')) {
    return { alreadyAdmin: true, error: null };
  }
  roles.push('admin');
  // Update user's app_metadata
  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: { ...app_metadata, roles }
  });
  return { alreadyAdmin: false, error, data };
}

// PUBLIC_INTERFACE
async function main() {
  const args = parseArgs();
  let { email, id } = args;

  if (!email && !id) {
    console.log("No user specified via CLI args.");
    email = await prompt("Enter user's email to promote to admin: ");
  }
  if (!email && !id) {
    console.error("Aborted: No user provided.");
    process.exit(1);
  }
  // Step 1: Find user
  console.log(`Searching for user (${email ? 'email: ' + email : 'id: ' + id})...`);
  const user = await findUser({ email, id });
  if (!user) {
    console.error("User not found. Please check the email or user ID.");
    process.exit(2);
  }
  console.log(`Found user: ${user.email} (${user.id})`);
  // Step 2: Promote to admin
  const { alreadyAdmin, error } = await promoteUserToAdmin(user);
  if (error) {
    console.error("Error updating user metadata:", error.message || error);
    process.exit(3);
  }
  if (alreadyAdmin) {
    console.log("The user already has the 'admin' role.");
    process.exit(0);
  }
  console.log("Success: User promoted to admin. 'admin' role added in app_metadata.roles.");
  process.exit(0);
}
if (require.main === module) main();
