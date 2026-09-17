import { createClient } from '@supabase/supabase-js';

// Browser-side client — uses the public anon key.
// Safe to use in components; RLS policies restrict what it can do
// (insert reports, read zones/alerts — never read raw reports).
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Server-side client — uses the service role key, which bypasses
// RLS. ONLY ever import this inside app/api/* route files, never
// in a component that ships to the browser.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
