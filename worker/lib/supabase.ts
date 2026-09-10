import { createClient } from "@supabase/supabase-js";

/**
 * The worker is a standalone Node process (not part of the Next.js app), so
 * it gets its own service-role client rather than importing from src/lib —
 * that module tree assumes Next's request/response lifecycle.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
