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

Troubleshooting:
- If you see errors about "public.run_sql missing", execute the SQL manually via Supabase SQL editor or restore the RPC helper.
