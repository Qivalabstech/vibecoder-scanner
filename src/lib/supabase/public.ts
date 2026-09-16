import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Anon-key client with no cookie access — for server-rendered reads of
 * data that's genuinely public (RLS grants anon SELECT), like
 * pricing_config. The cookie-based server client in server.ts calls
 * cookies() unconditionally, which forces any page using it into dynamic
 * rendering even when the page has no per-user content — this client
 * lets a page like the marketing homepage stay statically generated.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
