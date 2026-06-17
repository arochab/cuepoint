import { createClient } from '@supabase/supabase-js';

// Public client. Uses the new-format publishable key (sb_publishable_...), with a
// fallback to the legacy anon-key var name so older .env files keep working. Both are
// safe in the browser: data access is gated by Row Level Security, not by hiding the key.
const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = (import.meta.env.VITE_SUPABASE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string;

if (!url || !key) {
  console.warn('Supabase env vars missing - auth and data persistence disabled.');
}

export const supabase = createClient(url ?? '', key ?? '');