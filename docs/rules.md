# Rules

## Use

- **Next.js 16 conventions, not older training-data conventions.** This
  version has real breaking changes: `middleware.ts` → `proxy.ts` (export
  `proxy`, not `middleware`), dynamic route params are `Promise`-wrapped
  (`await ctx.params` / `await params`), route handler context is typed via
  the global `RouteContext<'/path/[id]'>` helper. Read
  `node_modules/next/dist/docs/` before assuming an API shape. Run `npx next
  typegen` after adding a new dynamic route before typechecking — the
  `RouteContext`/`PageProps` globals are generated, not hand-written.
- **Every new table needs explicit, `REVOKE`-first `GRANT`s for
  `authenticated` — never assume the environment's default privileges.**
  `create table` + RLS + policies is not enough (Postgres checks table-level
  privilege before RLS runs at all), and a bare `GRANT` is not safe either:
  a column-level `REVOKE` does **not** override a coexisting table-level
  `GRANT` — confirmed by directly attacking a real hosted Supabase project,
  twice (see `architecture.md` → Key decisions, "RLS policies are necessary
  but not sufficient"). Local and hosted Supabase start from *different*
  default ACL states for `authenticated`, in opposite directions. The only
  safe pattern: `revoke insert, update, delete on public.<table> from
  authenticated;` first, then `grant` back only the exact narrow thing that
  should be client-writable (ideally nothing beyond `select` — route every
  write with a business rule attached through the service-role client
  instead, after the route validates it server-side). `grant all on
  public.<table> to service_role` alongside. Skipping the `revoke` step
  produces a table that *looks* locked down (your new `grant` is scoped
  correctly) but isn't (an ambient table-level grant you never issued still
  applies) — this fails silently, with no error to notice.
- **Three Supabase clients, pick deliberately**: `src/lib/supabase/client.ts`
  (browser, anon key), `server.ts` (RLS-scoped, cookie-based session, use in
  Server Components and most route handlers), `service.ts` (service-role,
  bypasses RLS — only in trusted server code that needs to write a column
  the `authenticated` role can't touch, or read across users for
  system-level checks like rate limiting).
- **shadcn/ui here is Base UI, not Radix.** `Button` uses `render={<Link
  .../>}` instead of `asChild` + a child element, and needs `nativeButton`
  set correctly (the local `Button` wrapper already defaults it off when
  `render` is passed). `Select` needs an `items={{value: label}}` map on the
  root for the trigger to display the selected label — without it, the
  trigger shows the raw value string.
- **lucide-react has no brand icons** in the installed version (`Github`
  etc. were removed upstream). Use `src/components/icons/github-icon.tsx`
  (hand-rolled SVG) rather than reaching for a lucide import that doesn't
  exist.
- **Zod for both request-body validation and Claude structured output** —
  `client.messages.parse()` + `zodOutputFormat()`, not manual JSON parsing
  of a tool call.
- **Reduced-motion and capability checks via `useSyncExternalStore`**, not
  `useEffect` + `setState` — avoids the `react-hooks/set-state-in-effect`
  lint error and the SSR/hydration flash. See `src/lib/use-reduced-motion.ts`
  and `src/components/three/scan-visual.tsx`.

## Avoid

- Don't add a fourth Supabase client or a raw `createClient()` call outside
  `src/lib/supabase/*` — every route/component should import one of the
  three existing wrappers.
- Don't write to `targets.verified*` or `users.plan`/`razorpay_*` from the
  RLS-scoped client — migration `0005` blocks it at the database level
  regardless, so it will fail; use the service-role client.
- Don't trust the client's selection/input for anything security-relevant.
  The GitHub repo picker and the "verify now" button are UX only — the
  actual authorization decision is always re-derived server-side (live
  GitHub API call, live DNS/meta-tag check).
- Don't add scanning behavior that's active/exploitative. ZAP runs in
  baseline (passive) mode only — this is a stated legal/safety requirement,
  not a default that can be casually changed.
- Don't let AI-analysis or email failures block a scan from completing —
  both are wrapped to degrade gracefully (see `architecture.md` → Key
  decisions).

## Error handling conventions

- Route handlers return `NextResponse.json({ error, message? }, { status })`
  — `error` is a machine-readable slug, `message` (when present) is what the
  UI shows via `toast.error(json.message ?? fallback)`.
- Every security-relevant event (verification attempt, scan trigger
  allowed/denied, billing webhook processed, schedule change) is written to
  `audit_log` via `logAudit()` — this is the audit trail Phase 8 requires,
  not optional logging.
- The worker never lets a scan sit in `queued`/`running` forever on
  failure — every code path that can fail transitions the scan to `failed`
  with `completed_at` set before returning/throwing.

## AI boundaries — flag the user before changing

- **`supabase/migrations/0007_lock_down_all_client_writes.sql`** (and the
  earlier, superseded `0005`/`0006` attempts) and anything touching what
  `authenticated` can write on any table. This is the fix for a real
  ownership-verification bypass (raw `INSERT` creating a pre-verified
  target) and a real billing bypass (raw `PATCH` setting `users.plan` to
  `'paid'`) — both confirmed working against a live hosted Supabase project
  before `0007`. Don't loosen it without understanding why it exists, and
  don't assume a column-level `REVOKE` is sufficient protection on its own —
  it isn't, see `architecture.md`. If a new client-side write is genuinely
  needed, add it as a new narrowly-scoped `grant` in a new migration, never
  by widening what `0007` already locked down.
- **`src/proxy.ts`'s `PROTECTED_PREFIXES`**, especially the explicit
  exclusion of `/api/billing/webhook` (must stay reachable unauthenticated —
  Razorpay's servers call it directly and it verifies itself via HMAC
  signature) versus `/api/billing/subscribe` and `/cancel` (must stay
  auth-gated).
- **Anything in `worker/scanners/*` that changes ZAP's scan mode** away from
  baseline/passive, or that adds `--network` access beyond what's currently
  granted (Semgrep's registry-fetch exception is deliberate and documented
  inline; don't extend the pattern casually).
- **The Razorpay webhook signature check** (`Razorpay.validateWebhookSignature`
  in `src/app/api/billing/webhook/route.ts`) and the requirement to read the
  **raw** request body (`request.text()`) before parsing — parsing first
  breaks signature verification.
- **`src/lib/rate-limit.ts`'s scan-trigger limit** — exists specifically so
  the platform can't be used as a scanning proxy against arbitrary targets;
  raising or removing it is a product/legal decision, not a perf tweak.
- **The "draft, pending legal review" banner on `src/app/legal/terms/page.tsx`**
  and the governing-law/contact placeholders in that page's copy. Don't
  remove or soften either without an actual lawyer's sign-off — an AI
  session (this one included) cannot provide that sign-off, only a fuller
  draft.
- **`worker/lib/abuse-monitor.ts`'s `THRESHOLD`/`WINDOW_MS`** — tune with
  real usage data, not a guess; too low pages a human for normal user
  error (a mistyped DNS record), too high misses real probing.
