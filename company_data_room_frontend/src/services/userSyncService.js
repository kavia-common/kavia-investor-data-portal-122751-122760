import { supabase } from "./supabaseClient";

/**
 * Ensures that a user exists in the SQL 'users' table.
 * Checks if user by id/email exists, if not, inserts a new row.
 * Prevents duplicates using user id as the primary key.
 *
 * @param {Object} user - The user object as received from Supabase (expects .id and .email).
 * @returns {Promise<void>}
 */
// PUBLIC_INTERFACE
export async function ensureUserInSQLTable(user) {
  if (!user || !user.id || !user.email) {
    console.warn("Invalid user object received for ensureUserInSQLTable", user);
    return;
  }

  // Check if user exists by `id`
  let { data: existing, error: fetchErr } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (fetchErr) {
    console.error("Error checking user existence in SQL table:", fetchErr);
    return;
  }
  if (existing) return; // User already exists, nothing to do

  // Insert new user row
  let insertObj = {
    id: user.id,
    email: user.email,
    // add more props as needed
  };

  const { error: insertErr } = await supabase.from("users").insert([insertObj]);
  if (insertErr) {
    // Duplicate key error or race, simply ignore
    if (insertErr.code === "23505" || insertErr.message.includes("duplicate key")) {
      return;
    }
    console.error("Error inserting new user into SQL users table", insertErr);
  }
}
