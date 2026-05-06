import { createClient } from '@supabase/supabase-js';

// Server-side admin client. Bypasses RLS — never expose this to a browser.
export const supaAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Anon client — used only to verify user JWTs against Supabase
export const supaAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'kyc';
