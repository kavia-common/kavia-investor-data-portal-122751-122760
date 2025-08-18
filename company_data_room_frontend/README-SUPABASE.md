# Supabase Admin Function: list_users_with_metadata

## Purpose

This function lists all users' `id`, `email`, and `roles` as found in the `auth.users` metadata. It is used for admin user management in the investor data room frontend.

## Deployment Steps

1. **Open Supabase SQL Editor**:
   - Navigate to your Supabase project's dashboard.
   - Select "SQL Editor" > "New Query".

2. **Paste Function Code**:
   - Open the file: `assets/list_users_with_metadata.sql` (from this repository).
   - Paste the SQL into the Supabase SQL Editor.

3. **Review and Execute**:
   - Confirm the function SELECTs **id**, **email**, and **roles** from `auth.users`.
   - Ensure access is restricted using a security check such as
     ```
     if (current_setting('request.jwt.claims', true)::json->>'role' <> 'admin') then
       raise exception 'Insufficient privileges';
     end if;
     ```
     or via a similar security policy.

4. **Run the Query**.

5. **Verify Permissions**:
   - Confirm only users with the `admin` role can execute this function using RLS (Row Level Security) or explicit checks in function logic.
   - If needed, create a Postgres policy or alter the function as SECURITY DEFINER and limit execution via Postgres roles.

6. **Test**:
   - From Supabase SQL Editor, call the function as an admin account and as a non-admin to confirm the restriction is enforced.

## Usage Example

```sql
select * from list_users_with_metadata();
```

This will return a list of records like:

| id                                   | email                  | roles             |
|---------------------------------------|------------------------|-------------------|
| 358cf8a9-...-e923bbf5c0bb             | admin@example.com      | ["admin"]         |
| 4f5a63d5-...-cc1b28d681a3             | founder@company.com    | ["founder"]       |

## Security Note

It is critical for sensitive operations that ONLY authorized admin users can execute this function. This ensures compliance and the privacy expectations of all investors and founders.

---

_Last step: Copy, paste, and run in your Supabase instance as described above._
