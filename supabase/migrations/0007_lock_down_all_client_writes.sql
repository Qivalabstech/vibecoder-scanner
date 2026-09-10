-- Found via a real attack simulation against a real hosted Supabase project
-- (not local): a logged-in user could INSERT a target with `verified: true`
-- directly (total bypass of the ownership-verification gate), PATCH
-- `users.plan` to `'paid'` directly (total billing bypass), and — checked
-- immediately after — had raw INSERT/UPDATE/DELETE on every other table
-- too: `findings` (forge fake scan results), `audit_log` (tamper with or
-- erase their own audit trail), `github_connections` (overwrite their own
-- stored OAuth token reference).
--
-- Root cause, confirmed empirically: hosted Supabase pre-grants
-- `authenticated` broad table-level privileges independent of anything this
-- project's migrations do — migration 0006's column-level `GRANT`/0005's
-- column-level `REVOKE` approach assumed a restrictive baseline (true
-- locally, false on hosted). A column-level REVOKE does not override a
-- coexisting table-level GRANT in Postgres; the only reliable fix is to
-- REVOKE the table-level privilege outright, then GRANT back exactly the
-- narrow capability that's actually needed.
--
-- New rule, applied everywhere: the RLS-scoped (`authenticated`) client
-- gets SELECT on what a user should be able to read, plus at most one
-- narrow, genuinely-safe write (targets.scan_frequency — a user preference,
-- not a security boundary). Every other write — target creation, the
-- verified flag, scan creation and status, findings, audit_log,
-- github_connections, billing fields — goes through the service-role
-- client from server-validated route code, full stop. This migration pairs
-- with the corresponding change in src/app/api/targets/route.ts and
-- src/app/api/targets/[id]/scan/route.ts, which switch their INSERTs from
-- the RLS-scoped client to the service-role client.

revoke insert, update, delete on public.users from authenticated;
revoke insert, update, delete on public.targets from authenticated;
revoke insert, update, delete on public.scans from authenticated;
revoke insert, update, delete on public.findings from authenticated;
revoke insert, update, delete on public.audit_log from authenticated;
revoke select, insert, update, delete on public.github_connections from authenticated;

-- The one narrow exception: users can still toggle their own scan schedule.
grant update (scan_frequency) on public.targets to authenticated;

-- service_role is unaffected by any of the above (separate role, already
-- has `grant all` from migration 0006) — re-asserted here defensively in
-- case a platform default ever narrows it the way `authenticated`'s was.
grant all on public.users, public.targets, public.scans, public.findings,
  public.audit_log, public.github_connections to service_role;
