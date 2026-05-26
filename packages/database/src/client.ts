import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// Supabase Client Factory
// ============================================================
// Two clients:
//   - anonClient  → for LIFF frontend (respects RLS)
//   - serviceClient → for bot/api backends (bypasses RLS)
// ============================================================

let _anonClient: SupabaseClient | null = null;
let _serviceClient: SupabaseClient | null = null;

/** Frontend client — uses anon key, respects RLS policies */
export function getAnonClient(): SupabaseClient {
  if (_anonClient) return _anonClient;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables"
    );
  }

  _anonClient = createClient(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return _anonClient;
}

/** Server-side client — uses service role key, bypasses all RLS */
export function getServiceClient(): SupabaseClient {
  if (_serviceClient) return _serviceClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
    );
  }

  _serviceClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _serviceClient;
}

/** Reset clients (useful for testing) */
export function resetClients(): void {
  _anonClient = null;
  _serviceClient = null;
}
