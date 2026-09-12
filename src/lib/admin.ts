/**
 * Super-admin membership is an env var allowlist, not a database column —
 * deliberately. A DB flag would need its own write-path and privilege
 * story (who can set it, checked how) to avoid becoming a privilege-
 * escalation vector; an env var can only be changed by whoever deploys
 * the app, never by any in-app action. Comma-separated list of emails.
 */
export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}
