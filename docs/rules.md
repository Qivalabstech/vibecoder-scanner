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
- Don't write to `targets.verified*` or `users.plan`/`paypal_*` from the
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
  PayPal's servers call it directly and it verifies itself by round-tripping
  through PayPal's own signature-verification API) versus
  `/api/billing/subscribe` and `/cancel` (must stay auth-gated).
- **Anything in `worker/scanners/*` that changes ZAP's scan mode** away from
  baseline/passive, or that adds `--network` access beyond what's currently
  granted (Semgrep's registry-fetch exception is deliberate and documented
  inline; don't extend the pattern casually).
- **The PayPal webhook signature check** (`verifyPaypalWebhookSignature` in
  `src/lib/paypal.ts`, called from `src/app/api/billing/webhook/route.ts`)
  and the requirement to read the **raw** request body (`request.text()`)
  before parsing — parsing first breaks signature verification. Unlike
  Razorpay's local HMAC check, this one round-trips to PayPal's own
  `/v1/notifications/verify-webhook-signature` endpoint, so it also needs
  `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET` (to get an access token) in
  addition to `PAYPAL_WEBHOOK_ID`.
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
- **`SUPER_ADMIN_EMAILS` / `src/lib/admin.ts`'s `isSuperAdminEmail()`** —
  this is intentionally an env-var allowlist, not a database column or
  any in-app "make me admin" action. Don't add a DB-backed admin flag
  without re-deriving the same privilege-escalation analysis migration
  `0007` did for every other table: who can set it, and through what
  write path. Every `/api/admin/*` route re-checks this server-side —
  don't rely on the `(admin)/admin` layout's redirect alone, since API
  routes are reachable directly.
- **`pricing_config`** only controls the *displayed* Pro price on the
  marketing page — it has no connection to what PayPal actually charges
  (`PAYPAL_PLAN_ID`'s plan). Don't let the two drift without telling the
  user; the admin pricing page's warning banner explaining this is
  load-bearing copy, not decoration. As of migration `0009`, the column is
  `pro_price_usd` (USD, not INR) — PayPal bills USD natively, so (unlike
  the earlier Razorpay setup) there's no merchant-account currency gate to
  clear first, just real `PAYPAL_*` credentials.
- **Billing provider is PayPal, not Razorpay, as of migration `0010`.**
  `users.paypal_subscription_id`/`paypal_payer_id` replaced
  `razorpay_customer_id`/`razorpay_subscription_id` (dropped in the same
  migration — confirmed zero live subscribers before dropping). PayPal has
  no "cancel at cycle end": `POST /api/billing/cancel` downgrades the user
  to `free` immediately, unlike the old Razorpay flow which let a
  cancelled sub run out its paid period. Don't reintroduce a deferred-
  cancellation UX without also solving how to stop PayPal from billing
  again in the meantime — the two have to change together.
