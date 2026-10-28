import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Klien Supabase anonim untuk aksi Auth yang tidak butuh sesi.
 *
 * Sengaja memakai **implicit flow**: tautan reset harus bisa dibuka di
 * perangkat mana pun. PKCE menyimpan code-verifier di browser peminta,
 * sehingga tautan tidak bisa ditukar di perangkat lain (dan reset dari panel
 * admin diminta oleh admin, bukan user).
 *
 * Dengan implicit flow, Supabase mengirim token di fragment
 * (`#access_token=…`) yang diproses `/auth/recovery`.
 *
 * Jangan pakai klien ini untuk operasi yang butuh sesi/RLS user.
 */
export function createImplicitAnonClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      flowType: "implicit",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
