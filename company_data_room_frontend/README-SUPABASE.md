IMPORTANT: Supabase Configuration Required

1) Environment variables (see .env.example)
- REACT_APP_SUPABASE_URL
- REACT_APP_SUPABASE_KEY
- REACT_APP_SITE_URL (e.g., http://localhost:3000 for dev)
- REACT_APP_SUPABASE_DOCS_BUCKET (optional; defaults to 'documents')

2) Supabase Dashboard configuration
- Authentication > URL Configuration:
  * Site URL: your production domain (e.g., https://yourapp.com)
  * Additional Redirect URLs:
    - http://localhost:3000/**
    - https://yourapp.com/**
- Realtime: enable on public.notifications

3) Database and Storage
- Run the SQL in assets/supabase.md (Sections 3 and 4) to create tables and RLS policies, and the 'documents' storage bucket.

4) NDA Edge Functions (optional)
- Implement 'start_nda' and 'get_nda_status' Edge Functions and wire them to src/hooks/useNDA.js where TODO markers are present.

5) Promote a User to Admin (`admin` role) in Supabase Auth

**Purpose:**  
Used for initial setup and ongoing admin management, this secure CLI script lets a trusted maintainer add the `'admin'` role to a specific user's `app_metadata.roles` in Supabase. This enables admin panel and other elevated features for the user.

### Requirements

- Supabase Project URL (e.g. `https://<project>.supabase.co`)
- Supabase Service Role Key (find in your Supabase dashboard: Project Settings → API → Service Role)

**_Never share the Service Role Key with anyone except system administrators!_**

### Usage

1. _Navigate to the frontend folder and install dependencies (if not done):_
    ```sh
    cd company_data_room_frontend
    npm install
    ```

2. _Set environment variables in your shell (do NOT hard-code in code):_
    ```sh
    export SUPABASE_URL="https://<your-project>.supabase.co"
    export SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role"
    ```

3. _Run the script:_
    ```sh
    node scripts/promote_user_to_admin.js --email user@example.com
    ```

    - Or use `--id <user-uuid>` if the email is not available.
    - If no CLI args are provided, you will be prompted to enter an email interactively.

4. _The script will:_
    - Find the user and display their email/ID.
    - Add `'admin'` to their `app_metadata.roles` (if not already present).
    - Report clear success or detailed errors.

### Security & Recommended Practices

- Only system administrators should use this utility.
- Remove or lock down the Service Role Key after use.
- Use the script only from secure workstations, never from public/shared computers.
- All changes are **immediately live** via Supabase Auth.

### Troubleshooting

- If you see "User not found", verify the email address matches exactly or check in the Supabase dashboard.
- If errors occur about permissions, re-check the Service Role Key.
- The script requires dependencies: run `npm install @supabase/supabase-js` before first use if needed.

### Alternative: Supabase Dashboard

You can manually add the `'admin'` role:
  1. In Supabase dashboard, locate authentication users.
  2. Find the user, click "Edit", and modify `app_metadata.roles` to include `'admin'`.

Troubleshooting:
- If you see errors about "public.run_sql missing", execute the SQL manually via Supabase SQL editor or restore the RPC helper.
