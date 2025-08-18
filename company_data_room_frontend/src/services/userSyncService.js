import { supabase } from "./supabaseClient";

/**
 * PUBLIC_INTERFACE
 * Ensures the authenticated user exists in the SQL 'users' table.
 * If the user is not present, inserts a new entry (idempotent).
 * @param {Object} user - User object from Supabase Auth.
 * @returns {Promise<void>}
 */
export async function syncUserToSQLTable(user) {
  if (!user || !user.id || !user.email) return;

  // Check if user already exists
  const { data: users, error: selectError } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    console.error("Error checking user in SQL table:", selectError);
    // Optionally handle error (telemetry etc)
    return;
  }

  if (!users) {
    // Insert new user if not found
    const { error: insertError } = await supabase.from("users").insert([
      {
        id: user.id,
        email: user.email,
        // Add more fields here as needed
      },
    ]);
    if (insertError) {
      // May fail if there's a race condition; errors should be rare and non-fatal
      console.error("Error inserting user to SQL table:", insertError);
    }
  }
}
