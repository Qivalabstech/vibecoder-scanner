-- Found via an actual end-to-end test against a real Supabase instance: RLS
-- policies alone are not sufficient. Postgres checks table-level GRANTs
-- before RLS policies ever run, and this project's migrations (all applied
-- as the `postgres` role) inherited `postgres`'s own default ACL for
-- schema `public` — which, unlike `supabase_admin`'s default ACL, grants
-- `anon`/`authenticated`/`service_role` only TRUNCATE/REFERENCES/TRIGGER,
-- not SELECT/INSERT/UPDATE/DELETE. Every table created since migration
-- 0001 has been missing basic read/write privileges for the roles this
-- app actually uses — `authenticated` (RLS-scoped client) and
-- `service_role` (bypasses RLS via rolbypassrls, but RLS-bypass is not a
-- GRANT-bypass; it still needs table privileges).
--
-- Grants below are intentionally scoped to exactly what the app's own
-- client-side (RLS-scoped) code paths actually do today — not a blanket
-- table-level UPDATE. In particular, `targets` and `users` deliberately do
-- NOT get a table-level UPDATE grant here: migration 0005 already REVOKEd
-- UPDATE on specific security-sensitive columns from `authenticated`, and
-- a later broad `GRANT UPDATE ON table TO authenticated` would re-enable
-- UPDATE on ALL columns (table-level GRANT is not narrowed by an earlier
-- column-level REVOKE) — silently undoing that fix. Granting UPDATE only
-- on the specific columns the app's RLS-scoped client actually writes
-- avoids that trap entirely, rather than relying on ACL-layering behavior.

grant select on public.users to authenticated;
-- no UPDATE grant on users for `authenticated`: every column that exists
-- (id, email, plan, created_at, razorpay_*) is either immutable, managed by
-- Supabase Auth, or one of the columns 0005 already locked down — there is
-- currently no column the RLS-scoped client legitimately writes.

grant select, insert, delete on public.targets to authenticated;
-- UPDATE scoped to the one column the app's RLS-scoped client actually
-- updates (src/app/api/targets/[id]/schedule/route.ts) — deliberately
-- excludes verified/verified_at/verification_method/verification_token/
-- authorization_attested (migration 0005) and identifier/type (never
-- updated post-creation by any current code path).
grant update (scan_frequency) on public.targets to authenticated;

grant select, insert on public.scans to authenticated;
grant select on public.findings to authenticated;
grant select on public.audit_log to authenticated;
-- github_connections: no grant for authenticated — by design, only the
-- service-role client ever reads/writes it (see migration 0002).

grant all on public.users, public.targets, public.scans, public.findings,
  public.audit_log, public.github_connections to service_role;
