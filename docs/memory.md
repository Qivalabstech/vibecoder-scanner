# Memory

## Current state (2026-09-24, dogfooding round 4: post-landing-page scan)

Rescanned hakscan.online after the landing page replacement + mobile
nav. 8 findings: High CSP `script-src unsafe-inline` (unchanged,
already-documented tradeoff from earlier this session — Next.js's own
hydration scripts need it); Medium COOP/COEP (unchanged, deliberate —
PayPal checkout compatibility); Low caching findings (unchanged, false
positives — the homepage's `public` cache-control is *correct* for a
page with zero sensitive content, confirmed earlier this session). Two
new High findings from the landing page's own additions, worth real
investigation:

**Fixed — Cross-Domain Misconfiguration**: evidence was
`Access-Control-Allow-Origin: *` on the homepage. Verified via direct
`curl` (not assumed) that this is a **Vercel platform default**
injected on statically-prerendered responses specifically — present on
`/` and `/login` (both `x-nextjs-prerender: 1`), completely absent on
real dynamic routes (`/dashboard`, `/api/billing/webhook`) and nowhere
in this project's own `next.config.ts`. Nothing on these pages needs
cross-origin fetch access. Added an explicit
`Access-Control-Allow-Origin: https://hakscan.online` in
`next.config.ts`'s `headers()` to replace the wildcard — needs
verifying after deploy that an explicit origin header actually
overrides Vercel's injected default rather than being additive with
it (if the platform ADDS `*` regardless, the origin's own explicit
header should still take precedence per HTTP header merge semantics,
but confirm rather than assume).

**Investigated, not fixed — Sub Resource Integrity Attribute Missing**:
evidence was the `<link rel="preload">` hint `next/script` auto-emits
for the GA tag (`strategy="afterInteractive"`). This is the same class
of finding as the CSP one: Google's own documented position is that
SRI isn't viable for `gtag.js` specifically, because the file is
updated without notice — a fixed integrity hash would silently break
Analytics the next time Google ships a change. Considered avoiding the
preload hint (`strategy="lazyOnload"`) to dodge the specific tag
pattern ZAP checks, but that doesn't make the script more secure, only
delays real Analytics initialization to appease the scanner — not a
real fix, so left alone and documented here instead of forcing one.

## Current state (2026-09-24, landing page mobile nav)

Added the mobile nav the new landing page's own source file never had
(it just hid `.navlinks` below 800px with nothing in its place — noted
and left as-designed when the page first shipped, per the user's
"preserve exactly as written" instruction at the time; now explicitly
asked for).

- **`src/components/landing/mobile-nav.tsx`** (new, client component)
  — hamburger toggle + slide-down panel with the same four nav links
  plus a full-width CTA, imports `landing.module.css` directly (CSS
  Modules are fine to import from multiple files — Next dedupes at
  build time) so it shares the page's exact tokens/typography rather
  than inventing a second design language.
- **`landing.module.css`** — panel is `position: absolute` off
  `.header` (already `position: sticky`, the nearest positioned
  ancestor) specifically so the toggle button and panel div can live
  inside the existing flex `.nav` row in the DOM without being
  squeezed into that flex layout.
- Found by testing, not assumed: with the hamburger added, the header
  now had three items at mobile width (brand, the existing "Scan my
  project" CTA, toggle) and the CTA text wrapped awkwardly to two
  lines. Since the panel already has its own full-width CTA, hid the
  header's standalone one below 800px (`.navCta` class) rather than
  cramming three things into one row — confirmed clean after rebuilding
  and re-testing at 375px.
- Verified: link tap scrolls to the right section and auto-closes the
  panel; desktop (1280px) shows the original nav links + CTA with no
  hamburger, completely unaffected.

## Current state (2026-09-24, full landing page replacement)

User supplied a complete new landing page as a standalone HTML/CSS
file and asked for it converted into the site's real homepage, with
copy/structure/Meta Pixel preserved exactly and the `#start` CTAs
wired to real signup. Confirmed first (the file's design — light
paper background, serif Newsreader body text, teal accent — is a
different visual system than the rest of the app's dark/monospace
"OPERATOR CONSOLE" theme) that the user wanted this page's *own*
header/footer kept as designed, not the existing dark
`MarketingNav`/`MarketingFooter` bolted on — this is a full landing
redesign, not a content swap onto the old chrome.

- **`src/app/landing.module.css`** (new) — the file's CSS, scoped
  under a `.landing` wrapper class rather than `:root`/`body`/`html`.
  Next's own CSS docs explicitly warn that "global styles ... currently
  does not remove stylesheets as you navigate between routes," so the
  original file's bare-element reset (`*`, `body`, `a`, `img`,
  `:focus-visible`) would have bled into every other route
  indefinitely once loaded. `html{scroll-padding-top}` (offsetting
  anchor jumps for the sticky header) can't be scoped to one route
  either — replaced with `scroll-margin-top` on each anchor-target
  section instead, same visual effect, fully scopable.
- **`src/app/page.tsx`** — replaces the previous homepage entirely.
  Loads `Newsreader` via `next/font/google` (this page only — the rest
  of the app only ever loaded JetBrains Mono); reuses the existing
  `--font-jbm` variable from `layout.tsx` rather than reloading it.
  Meta Pixel via `next/script` (`afterInteractive`, same pattern as the
  GA tag) with the `<noscript>` fallback preserved. Copy preserved
  verbatim. Kept the existing convention of fetching the real
  `pro_price_usd` from `pricing_config` rather than hardcoding "$24" —
  matches what the previous homepage already did.
- **CTA routing**: every `href="#start"` occurrence *and* the closing
  section's own `href="#"` button (clearly the same "go sign up" intent,
  even though its href text didn't literally match `#start`) now point
  to `/signup`. In-page nav anchors (`#how`, `#scans`, `#limits`,
  `#pricing`) left untouched. Footer's placeholder `href="#"` links:
  wired "Terms" to the real, existing `/legal/terms` (a dead link there
  when a real page exists would've been an obvious, avoidable defect);
  left "Privacy" as `href="#"` since no real privacy page exists in
  this project — didn't invent one.
- **`next.config.ts`** — added `connect.facebook.net` to `script-src`
  and `www.facebook.com` to both `img-src` (the noscript pixel) and
  `connect-src` (the JS beacon to `/tr`) — same "silently dropped, not
  visibly erroring" CSP lesson from the GA tag earlier. The Pixel's own
  inline init script needed no CSP change since `script-src` already
  carries `'unsafe-inline'` (kept from the earlier hydration
  investigation).

**Verified before pushing** (given how many times a CSP miss has bitten
this project silently): real production build (`next build` +
`next start`), confirmed in a real browser — zero console errors,
`window.fbq` is a real function with an empty queue after init+track
(meaning the pixel script actually processed the calls, not just
loaded), both Facebook scripts present with no CSP block, all three
CTAs resolve to `/signup` and one was click-tested through to the real
signup page, Terms resolves to `/legal/terms`, dark mode auto-detected
correctly via `prefers-color-scheme`, and `next build`'s route table
still shows `○` (static) for `/` — the `createPublicClient()` fix from
earlier this session still holds since the new page fetches pricing
the same cookie-free way the old one did.

**Left alone, not deleted**: `src/components/marketing/{nav,hero,
how-it-works,pricing-teaser,footer}.tsx` are now unused (confirmed via
grep — nothing imports them anymore) but left in place rather than
deleted, since removal wasn't asked for.

## Current state (2026-09-17, promo codes: fully automated PayPal plan creation)

User asked to make the promo codes feature actually live end-to-end,
not the manual-paste-a-plan-ID version built earlier. Confirmed
`PAYPAL_ENV=live` (real production PayPal, not sandbox) before
touching anything, and confirmed the real product ID the standard Pro
plan belongs to via a live `GET /v1/billing/plans/{PAYPAL_PLAN_ID}`
call rather than guessing: `hakscanpro`.

- **`src/lib/paypal.ts`** — added `getCurrentProPriceUsd()` (reads the
  real current price off PayPal itself, not `pricing_config` which is
  display-only and can drift — same reasoning the admin pricing page
  already documents) and `createPaypalPlan(name, description,
  priceUsd)` (real `POST /v1/billing/plans` under the `hakscanpro`
  product, `status: "ACTIVE"` — the plan is live and subscribable the
  instant this call succeeds).
- **`/api/admin/promo-codes` POST** — no longer takes a `paypalPlanId`
  from the admin. Computes the discounted price from PayPal's live
  base price, calls `createPaypalPlan()`, then creates the `promo_codes`
  row pointing at the real plan id it got back. If the DB insert then
  fails (e.g. duplicate code), the PayPal plan it already created isn't
  rolled back — said so plainly in the error message (deactivate it
  manually in the PayPal dashboard) rather than silently leaving an
  orphaned live plan unexplained. Percent discounts capped at <100.
- **`promo-code-form.tsx`** — dropped the "PayPal plan ID" field
  entirely; submit button reads "Creating the real PayPal plan…" while
  the request is in flight, since that's genuinely what's happening
  and takes a moment (a real PayPal API round-trip, not just a DB
  write).
- **`(admin)/admin/promo-codes/page.tsx`** — updated the warning
  callout to describe the automated flow instead of the manual one.

Not yet verified against a real promo code creation through the
actual UI (migration 0011 needs to be applied first — same pending
state as before). Next step once the migration lands: create one real
code through `/admin/promo-codes` as the live end-to-end test.

## Current state (2026-09-17, Google Analytics + first-party traffic view in admin)

Two asks: add the given gtag.js snippet, and show "where is traffic
coming from" inside the admin panel. The second one can't literally
pull live numbers *out of* Google Analytics without GA Data API
credentials (an OAuth service account + property ID), which nothing
in this session has — built a first-party substitute instead and said
so plainly in the admin page's own copy, rather than presenting it as
if it were GA data.

- **`src/app/layout.tsx`** — the gtag snippet via `next/script`
  (`strategy="afterInteractive"`) rather than raw `<script>` tags —
  Next's documented pattern, keeps it off the critical rendering path.
  Verified in a real production build (`next build` + `next start`):
  `window.dataLayer` shows real `gtm.dom`/`gtm.load` events after the
  external script loads, confirming it actually executes, not just
  that the tag is present in HTML.
- **`next.config.ts`** — CSP needed `googletagmanager.com` in
  `script-src` and `googletagmanager.com` / `*.google-analytics.com` /
  `*.analytics.google.com` in `connect-src`, or gtag's own requests get
  silently dropped with no visible error (learned this exact lesson
  earlier today with the CSP `unsafe-inline` investigation — checked
  for it this time before assuming the tag alone was enough).
- **`supabase/migrations/0012_page_views.sql`** (new, not yet applied —
  same pending-migration situation as promo codes) — a `page_views`
  table, service-role only.
- **`src/lib/traffic.ts`** (new) — `logPageView()` filters to real
  top-level page navigations only (excludes API routes, RSC
  prefetch/transition fetches — detected via the `next-router-prefetch`
  /`rsc` headers and `Accept: text/html`, the same signal Next's own
  CSP-nonce docs use to tell these apart), logs path + referrer host
  (only when it's a different host — same-site referers aren't a
  traffic *source*) + UTM params, swallows its own errors so a logging
  failure can never surface near the real response.
- **`src/proxy.ts`** — calls `event.waitUntil(logPageView(request))`
  at the top, fire-and-forget (Proxy defaults to the Node.js runtime in
  Next 16, so a normal service-role Supabase call works fine here) —
  doesn't block or slow down the auth-check logic already in this file.
- **`(admin)/admin/traffic/page.tsx`** (new) + sidebar link — page
  views, top referrers, top UTM sources, top pages, last-7-days-with-
  traffic, all aggregated server-side from the last 30 days. Same
  graceful-empty-state pattern as the promo-codes admin page for
  before the migration is applied (query fails silently, renders "no
  data" rather than crashing).

## Current state (2026-09-17, admin: delete a user)

Requested so the admin can clear out a test account (e.g.
bareloop2026@gmail.com, used to reproduce the BorderBeam click bug)
and let it retry cleanly instead of staying stuck on whatever the
free-plan single-target limit already used up.

- **`src/app/api/admin/users/[id]/route.ts`** (DELETE, new) — admin-only.
  Deletes via `service.auth.admin.deleteUser(id)` (the Supabase Admin
  API on `auth.users`), not a plain table delete — `public.users.id`
  references `auth.users(id) on delete cascade`, and
  targets/scans/findings/github_connections all cascade from
  `public.users` in turn (migrations 0001/0002), so this one call
  tears down everything the user owns and lets them sign up again from
  scratch with the same email/GitHub account. Refuses to delete an
  admin account (checked via `isSuperAdminEmail` on the target's
  email, not just the caller's) since the allowlist is an env var —
  nothing in-app could undo deleting the wrong one. Logs
  `admin.user.deleted` with the deleted user's id/email in metadata
  before they're gone (audit_log.user_id is `on delete set null`, so
  the row survives but needs the email captured beforehand to still
  mean anything).
- **`src/components/admin/delete-user-button.tsx`** (new) — a trash
  icon button per row in the admin users table, behind a real
  confirmation Dialog (destructive, irreversible — not a bare
  `confirm()` or an unconfirmed click, matching how this app treats
  other destructive actions). Admin's own row (and any other
  `SUPER_ADMIN_EMAILS` account) doesn't render the button at all,
  redundant with but not a replacement for the route's own server-side
  check.
- **`(admin)/admin/page.tsx`** — added the button as a 5th column in
  the existing users table.

Known gap, not hit yet since migration 0011 isn't applied to
production: `promo_codes.created_by` and `promo_redemptions.user_id`
both reference `public.users(id)` with no `on delete` action
specified (defaults to `NO ACTION`/restrict) — deleting a user who
created or redeemed a promo code would fail on that FK once promo
codes are live. Not fixed this pass; worth a migration tweak
(`on delete set null` for `created_by`, `on delete cascade` for
`promo_redemptions.user_id`) before that becomes a real scenario.

## Current state (2026-09-17, real bug: BorderBeam blocking all clicks on verified target cards)

A user (bareloop2026@gmail.com, real new signup) reported "Scan now"
not working on their verified repo target. Multi-round remote
debugging (audit log showed zero trace across every attempt even after
adding comprehensive error logging to the scan route; ruled out server,
API logic, session/auth, browser type, JS hydration errors via a real
console screenshot) eventually got a Network-tab screenshot showing
**zero request was even attempted** when clicking "Scan now" — and,
per the user, *no* button on the page responded to clicks, not just
that one.

Root cause: **`src/components/ui/border-beam.tsx`** — the decorative
animated-border effect shown on verified target cards
(`target-card.tsx`, `{target.verified && <BorderBeam ... />}`) is
`position: absolute; inset: 0` with no `pointer-events-none`. Being
absolutely positioned, it paints above the card's in-flow content
(including the "Scan now" button, a sibling inside the same `relative`
Card) and silently absorbs every click — no console error, since
nothing crashes; the click just lands on an invisible decorative div
instead of the button underneath it.

This wasn't a new bug from this session's changes — it's been there
since BorderBeam was added. It also explains something dismissed
without follow-up earlier in *this same session*: the very first
"Scan now" click during the "check the scan flow" request also did
nothing when clicked from the Targets *list* page — I switched to
testing from the target detail page instead (which has no BorderBeam)
and never circled back to explain the list-page failure. Should have
treated that as a real, worth-chasing signal instead of routing around
it.

**Fix**: added `pointer-events-none` to BorderBeam's className — one
class, purely decorative in all five of its usages (auth shell,
marketing hero, how-it-works, pricing teaser, target card), so it can
never legitimately need to intercept clicks anywhere.

**Process note for next time**: when a user reports something "not
working" with no error visible, the fastest real signal is always a
screenshot/recording of the actual DOM state — spent many rounds on
server-side audit-log analysis and hypothesis-generation (SSRF guard,
stale session, rate limiting, hydration crash, embedded-browser
quirks) before getting a Network-tab screenshot that immediately
showed "zero requests attempted," which was the one fact that actually
narrowed it down. Ask for that earlier when audit logs show nothing.

## Current state (2026-09-16, security hardening pass — beyond what the passive scanner catches)

User's framing: it shouldn't be the case that we scan other people's
repos for bugs while our own site has real ones the scanner can't see.
ZAP baseline is passive-only by design (Phase 8's non-negotiable), so
this pass looked specifically for the classes of bug a passive scanner
structurally cannot find — dependency CVEs, access control, SSRF,
open redirect — via direct code/dependency review, not another scan.

**Critical — patched**: `npm audit` showed Next.js 16.3.2 (the version
actually deployed) carries a **critical unauthenticated RCE**
(GHSA-p293-qw3h-jr36, plus a second RCE in the Image Optimization API
for AVIF files). Upgraded to `next@16.3.5` (patched). Also cleared 2
remaining moderate/high advisories (`js-yaml`, `qs` — both transitive
dev-tooling deps of `eslint`/`shadcn` CLI, never shipped to production,
still patched via `npm audit fix` for hygiene). `npm audit`: 0
vulnerabilities. Rebuilt + typechecked clean after the bump; `/` still
prerenders static.

**High — SSRF, fixed**: `checkMetaTag()` (site-ownership verification,
`lib/verification.ts`) and the ZAP baseline scanner
(`worker/scanners/site-scan.ts`, invoked from
`/api/targets/[id]/scan`) both fetch a user-submitted URL server-side
with no restriction on what it resolves to. **DNS ownership proof is
not a safety proof** — nothing stops someone from verifying a domain
they genuinely own that's pointed at `169.254.169.254` (the cloud
metadata IP on every major provider) or an internal address, then
using the product's own intended verify → scan flow to make our
infrastructure fetch it, with the ZAP container getting real network
access. New **`src/lib/ssrf-guard.ts`** — `isPubliclyRoutableHostname()`
resolves a hostname and rejects if any resolved address falls in a
private/reserved/loopback/link-local range (RFC1918, CGNAT, metadata
IP, IPv6 loopback/link-local/unique-local); fails closed on DNS errors
or an empty result. Wired in at two points: `checkMetaTag()` (checks
before the initial fetch, and again before following any redirect —
switched `redirect: "follow"` to `"manual"` with an explicit re-check
so a public host redirecting to an internal one doesn't bypass this),
and `/api/targets/[id]/scan` for `type === "site"` targets, re-checked
right before enqueueing — this second check matters independently of
the first since DNS can change between verification and scan time.
**Known remaining gap, stated honestly rather than overclaiming**: this
closes the request-time TOCTOU window but doesn't fully defend against
DNS rebinding *mid-request* (an attacker's resolver returning a public
IP for our lookup, then a private one for the actual fetch/connect a
moment later) — closing that completely needs a resolver-pinning fetch
implementation, which this pass didn't build.

**Medium — open redirect, fixed**: `/auth/callback`'s `next` query
param was concatenated straight into a server-side
`NextResponse.redirect()` with no validation — a param on a link that
could arrive from anywhere, including a phishing email built around a
real `hakscan.online/auth/callback?next=...` URL. Added a
same-origin-relative-path check (`starts with "/"`, not `"//"`, no
`"://"`) in both `auth/callback/route.ts` (server, the actual HTTP
redirect — the real risk) and `login-form.tsx` (client-side
`router.replace()`, lower risk since Next's router doesn't perform
cross-origin navigation for arbitrary strings, but hardened for
consistency since it reads the exact same attacker-controlled param).

**Medium — promo code enumeration, fixed** (self-review of the promo
codes feature built earlier this session, before it's even live): the
validate endpoint only required being logged in and had no rate limit,
making it a free oracle for discovering unpublished codes and their
discount value, or squatting a scarce redemption slot meant for a
partner. Added `isOverPromoValidateRateLimit()` to `lib/rate-limit.ts`
(20/hour per user, same DB-count pattern as the existing scan-trigger
throttle) and wired it into `/api/billing/promo/validate`.

**Reviewed and confirmed already correct, not changed**: RLS policies
on `scans`/`findings`/`targets` (properly scoped to `auth.uid()` via
joins, no `using (true)` patterns — the pages/routes that query them
via the cookie-scoped client, like `/scans/[id]`, rely entirely on
this and it holds up); PayPal webhook (verifies signature against raw
bytes before trusting anything, fails closed if unconfigured);
`/api/github/repos` (token never leaves the server, scoped to the
caller's own `github_connections` row); repo cloning (hardcoded to
`github.com`, `fullName` both zod-validated and re-checked against the
live GitHub API before use — no SSRF surface there, unlike the site
scanner); no `.env*` file ever committed to git history; no hardcoded
secrets found via pattern grep across `src/`/`worker/`.

**Noted, not fixed (low priority, real but minor)**: ~9 API routes
return raw Postgres/Supabase `error.message` directly to the client on
failure (schema/constraint-name disclosure, not a data-access issue —
callers can only trigger these on operations scoped to their own
data). Left as-is this pass; worth a follow-up if pursuing this
further.

## Current state (2026-09-16, dogfooding round 3: fixed the real homepage caching bug, tried and reverted a CSP fix)

Re-scanned hakscan.online with itself (user asked to leave promo codes
alone and go fix findings). Same 6 findings as the 09-14 scan: High CSP
`script-src unsafe-inline`; Medium "Retrieved from Cache",
COOP/COEP "Missing or Invalid"; Low "Non-Storable Content",
"Storable but Non-Cacheable Content".

**Not touching (already-decided, still correct) tradeoffs**:
- COEP staying unset and COOP staying at `same-origin-allow-popups`
  (not strict `same-origin`) are the 09-14 session's own deliberate,
  tested calls — enabling either the scanner's suggested way breaks
  PayPal's checkout iframe/popup. ZAP just doesn't recognize the relaxed
  COOP value as "valid".
- "Retrieved from Cache" (Medium) — false positive. The homepage has
  zero sensitive/user-specific content; ZAP is flagging the presence of
  an `Age` header, which any CDN (Vercel's edge, here) adds regardless
  of whether the content is actually sensitive.

**Real fix — the homepage's caching architecture**: `/` was being
server-rendered dynamically (Next build showed `ƒ /`, confirmed via
`npx next build`'s route table) purely because `src/app/page.tsx` used
the cookie-based Supabase server client (`lib/supabase/server.ts`,
which calls `cookies()` unconditionally) just to read `pricing_config`
for the pricing teaser — a table that's genuinely public
(`pricing is publicly readable` RLS policy, migration 0008). Calling
`cookies()` anywhere in a page's render forces that whole page dynamic
in Next's App Router, which is also why it got a `no-store` Cache-Control
by default — this is what both Low findings and one instance of the
"Retrieved from Cache" evidence were actually about.
Fix: **`src/lib/supabase/public.ts`** — new, an anon-key client with no
cookie access, for exactly this case (server-rendered reads of data RLS
already makes public). `src/app/page.tsx` now uses it instead of the
cookie-based client. Verified with `npx next build`: `/` now shows `○`
(static) instead of `ƒ` (dynamic) in the route table — a real
architecture fix, not a header override.

**Tried and reverted — CSP `script-src unsafe-inline` (High)**: the
finding's own advice ("move inline scripts to external files") looked
promising, so moved the one inline script this app actually authors
(`themeInitScript` in `layout.tsx`) to `public/theme-init.js` and
dropped `'unsafe-inline'` from `next.config.ts`'s CSP. **Verified this
was wrong before shipping it** — built production (`next build` +
`next start`) and checked the real browser console: React error #412
and a wall of CSP violations, because Next.js App Router itself injects
inline `self.__next_f.push(...)` scripts to stream RSC payloads for
hydration, and those got blocked too — the whole app silently lost all
interactivity (theme toggle, every button, every client component).
The only real fix for this finding is nonce-based CSP via `proxy.ts`,
and Next's own docs are explicit that nonces require **every page using
one to render dynamically** — which would undo the homepage static-
rendering fix above (and force it onto every other page) for one
scanner finding whose only realistic exploit path already requires an
attacker who can inject markup into the page in the first place. Not a
good trade. Reverted both the `layout.tsx` extraction and the CSP
change back to exactly what they were — `git diff` on `layout.tsx` is
now empty. Documented the reasoning directly in `next.config.ts`'s
comment so this isn't re-attempted without knowing why it was reverted.

## Current state (2026-09-16, promo codes feature + scan-report overflow fix)

Two things from checking the scan flow and building promo codes:

**Scan flow verified end-to-end on production**: triggered a real scan
on `https://hakscan.online` from Targets → target detail → Scan now —
watched the live step tracker (Resolving target → ZAP baseline →
Triaging → Finalizing, auto-polling, no manual refresh), then the
completed report with real triaged findings (High: CSP
`script-src unsafe-inline`; Medium: COOP/COEP headers, cache; Low:
cache-control) grouped by severity with a working PDF report link.

**Found & fixed while checking it**: the scan report page
(`(dashboard)/scans/[id]/page.tsx`) had the *exact same* horizontal
overflow bug class already fixed once this session for the admin
console — `(dashboard)/layout.tsx`'s `<main>` is a row-flex item on
desktop/tablet (`flex-col md:flex-row`, so row-direction at `md:` and
up) without `min-w-0`, so on a real (non-mobile) viewport it couldn't
shrink below a long finding title's content width. Compounding it:
`FindingCard`'s title `<span className="flex-1 truncate">` was also
missing `min-w-0` — Tailwind's `truncate` alone doesn't stop a flex
child from sizing to its un-wrapped content; the two together silently
undo each other. Fixed both: `min-w-0` added to dashboard's `main`
(matches the admin layout fix) and to the finding-title span.

**Promo codes feature** (`/admin/promo-codes`), built after two rounds
of scoping with the user: real percentage/fixed discount, single-use
per code with an admin-set max redemption count. Key constraint driving
the design: PayPal subscriptions have no coupon API (unlike Stripe) —
the only way to actually change what's billed is to point the
subscription at a different PayPal Plan, the same constraint the
existing admin pricing page already documents for plain price changes.
So a code doesn't compute a discount itself: the admin creates the real
discounted plan in the PayPal dashboard first (existing manual
workflow, unchanged), then a promo code just maps to that plan's id;
discount_type/discount_value are a display label only, not a second
source of truth for what's charged.

- **`supabase/migrations/0011_promo_codes.sql`** — `promo_codes` +
  `promo_redemptions` tables, both locked down to service_role only
  (same revoke/grant pattern as every table since migration 0007).
  Redemption is a `redeem_promo_code(code, user_id)` plpgsql function
  using `for update` row-locking so two people racing for a code's last
  slot can't both succeed (a plain read-then-write from the API route
  would have that race). A paired `release_promo_redemption()` function
  compensates when the reserved slot doesn't turn into a real
  subscription (PayPal call fails, or billing isn't configured) — the
  two aren't one transaction since PayPal is a separate system, so this
  is a deliberate best-effort compensating action, not true atomicity
  across both.
  **Not yet applied to production** — no `SUPABASE_ACCESS_TOKEN`/DB
  password available to this session (same credential gap noted
  earlier), so `supabase db push` couldn't be run. Application code
  deployed ahead of the migration is safe: the subscribe route only
  touches the new tables/RPCs when a promo code is actually supplied,
  so existing checkout is unaffected until the migration runs.
- **`src/app/api/admin/promo-codes/route.ts`** (POST create) and
  **`[id]/route.ts`** (PATCH active/inactive) — admin-only, same
  re-check-auth-server-side-even-though-layout-redirects pattern as
  `/api/admin/pricing`.
- **`src/app/api/billing/promo/validate/route.ts`** — read-only check
  (exists, active, not exhausted, not already used by this user) so the
  checkout UI can show "20% off" before the user commits, without
  burning a redemption slot just from checking.
- **`src/app/api/billing/subscribe/route.ts`** — now accepts an
  optional `promoCode`; when present, calls `redeem_promo_code()` first
  and uses its returned plan id instead of `PAYPAL_PLAN_ID`, then calls
  `release_promo_redemption()` in the catch/failure paths.
- **`src/app/(admin)/admin/promo-codes/page.tsx`** + `promo-code-form.tsx`
  + `promo-code-toggle.tsx` — list + create form + active/inactive
  toggle, same layout conventions as the existing admin pricing page
  (including its own warning callout about the PayPal-plan constraint).
  Added to `admin-sidebar.tsx` nav.
- **`src/components/dashboard/upgrade-button.tsx`** — added an optional
  "Have a promo code?" input above the Upgrade button; validates via
  the read-only endpoint, shows the applied discount, and passes the
  code through to `/api/billing/subscribe` on checkout.

## Current state (2026-09-16, admin console mobile overflow fix)

Full "check everything" sweep after the dashboard mobile nav work turned
up a real, pre-existing bug: the admin console (`/admin`) scrolled
horizontally on mobile — stat cards and the users table were cut off
past the viewport edge, confirmed with `getBoundingClientRect()` on
production (main content div measured 483px wide at a 375px viewport).

Root cause: `src/app/(admin)/admin/layout.tsx`'s `<main
className="flex-1 p-6 md:p-10">` sits in a row-direction flex container
(`flex min-h-screen`). Flex items default to `min-width: auto`, so
`main` wouldn't shrink below the intrinsic min-content width of its
widest child (the audit-log rows / stat-card grid), pushing the whole
page wider than the viewport. This is unrelated to and predates the
dashboard mobile-nav work — the regular dashboard doesn't have this bug
because its outer container was changed to `flex-col md:flex-row` for
the mobile nav, so on mobile it's column-direction (width is the cross
axis, which shrinks normally).

**Fix**: added `min-w-0` to that `<main>` — one class, no structural
change (`(admin)/admin/layout.tsx`). Asked before fixing since it's a
bug outside the requested task's scope; user said yes.

That fix stopped the page-wide scroll but surfaced a second-order
effect: the users table (`(admin)/admin/page.tsx`) is 483px wide
(4 columns, `table-layout: auto`) inside a `Card` with `overflow:
hidden` that's now correctly constrained to ~327px — so the "Joined"
column was being silently clipped instead of page-scrolled. Fixed by
giving the table's own `CardContent` `overflow-x-auto` and the table
`min-w-max`, so it scrolls within its own container per the
"wide content gets its own overflow-x-auto" rule, rather than clipping
or re-breaking the page-wide fix. Didn't re-prompt for this one — same
bug investigation, same file area, same fix class the user had just
approved.

## Current state (2026-09-16, dashboard mobile nav)

Built the mobile nav for the regular user dashboard that was flagged and
left open in the previous session (the admin-only equivalent was
deliberately left as-is; this one affects real paying customers).

- **`src/components/ui/sheet.tsx`** — new, added via `npx shadcn add
  sheet`. The installer wrote `import { cn } from "cn"`, which is wrong
  for this project (every other UI component imports from
  `@/lib/utils`) — fixed the import, then removed the now-unused `cn`
  npm package the installer had also added to `package.json`. Tried
  VengeanceUI first per CLAUDE.md, but its MCP server was down
  (`CONNECTION_CLOSED`) — fell back to the project's existing shadcn
  setup rather than block on it.
- **`src/components/dashboard/mobile-nav.tsx`** — new. `md:hidden` header
  with "Hakscan" wordmark + hamburger trigger, opens a left-side `Sheet`
  with the same links/active-state logic as the desktop
  `DashboardSidebar` (Overview/Targets/Billing/Admin console), plus
  email, theme toggle, sign out. Closes on link click via `onClick={() =>
  setOpen(false)}` — a `Sheet` doesn't auto-close on internal navigation.
- **`src/app/(dashboard)/layout.tsx`** — renders `DashboardMobileNav`
  alongside the existing `DashboardSidebar`; each is hidden by Tailwind
  breakpoint (`md:hidden` / `hidden md:flex`) rather than one component
  branching on viewport, so there's no hydration mismatch risk.

**Verified without real login**: no stored dashboard credentials exist
(confirmed again this session), so real `/dashboard` navigation isn't
possible headlessly. Mounted both components together on a temporary
route (`src/app/mobilenavpreview123/page.tsx`, deleted after) to check
mobile (open/close the sheet, all links/icons/admin-console/sign-out
render) and desktop (mobile header absent, sidebar shows, no double
chrome) — then removed the scratch route and reran `tsc --noEmit` clean
before pushing.

## Current state (2026-09-16, SEO remediation from a pasted third-party audit)

User pasted a full SEO Audit Report for hakscan.online (score 42/100, 6
"critical" findings, 4 warnings, 3 opportunities). Fixed every critical
finding plus the `llms.txt` opportunity; verified end-to-end (typecheck →
`next build` → live production `curl`/DOM checks), not just "it compiles":

- **`src/app/robots.ts`** — new, Next 16 file convention
  (`MetadataRoute.Robots`). Allows `/`, disallows the four auth-gated
  route groups (`/dashboard`, `/targets`, `/settings`, `/admin`), points
  at the sitemap.
- **`src/app/sitemap.ts`** — new (`MetadataRoute.Sitemap`). Confirmed via
  `find src/app -name page.tsx` that `/`, `/login`, `/signup`,
  `/legal/terms` are the *only* public routes before listing them — did
  not guess the route list.
- **`src/app/opengraph-image.tsx` + `twitter-image.tsx`** — new,
  `next/og`'s `ImageResponse`. Root cause of why this needed real care:
  `ImageResponse` (Satori) does not inherit page fonts — `fontFamily`
  strings alone resolve to nothing without real TTF bytes passed via the
  `fonts` array, so it reads the same `jbm-bold.ttf`/`jbm-regular.ttf`
  already shipped for `next/font/local` in `layout.tsx`. `twitter-image.tsx`
  re-exports it explicitly rather than relying on an og→twitter auto
  fallback that was never confirmed to exist. Verified by navigating
  directly to `/opengraph-image` and screenshotting the real rendered
  PNG, on both `next dev` and live production.
- **`src/app/layout.tsx`** — added `metadataBase`, extended
  title/description (41→51 / ~118→~180 chars, still modest per the
  audit's "too short" warnings, not keyword-stuffed), `alternates.canonical`,
  full `openGraph`/`twitter` metadata blocks, and a `SoftwareApplication`
  JSON-LD block in `<head>` with real `offers` pricing ($0 Free / $24 Pro,
  matching the live PayPal plan — not fabricated numbers).
- **`public/llms.txt`** — new, the audit's one "opportunity" item worth
  doing. Real product facts only (plans, ownership-verification gate,
  no third-party scan API — intentional, not a gap).

**Deliberately left alone** (product/content-scope decisions, not SEO
config): the "no img tags" and "single-page architecture" warnings — the
site is genuinely a single marketing page by design; adding images or
splitting pages to please an SEO checklist wasn't asked for and isn't a
config fix.

**Verification chain**: `next build` locally first (not just `next dev`,
since `next/og` reads font files from disk at module scope and needed to
be proven to work in a real production build) — all four new routes
showed `○` (static) with zero errors. Pushed, waited for Vercel deploy
(~30s propagation lag, confirmed via repeated `curl` rather than assumed),
then re-verified on the live `www.hakscan.online` domain: `robots.txt`,
`sitemap.xml` (real 4 URLs), `llms.txt`, `<title>`/canonical/OG tags,
`twitter:*` tags, and the JSON-LD script — all confirmed present and
correct via `curl` + grep and a direct browser screenshot of
`/opengraph-image`. (Console-error check on the live homepage was
inconclusive — the Browser pane tool itself blocked all `_next/static`
JS/CSS/font requests session-wide in this run, confirmed unrelated to
the site since `curl` returns real 200s for every blocked URL; not a
production bug.)

## Current state (2026-09-14, dogfooding: scanned Hakscan with itself)

Did a full end-to-end re-verification on the real `hakscan.online` domain
(signup, GitHub OAuth login, dashboard, admin, billing — all confirmed
live), then used the product on itself for real:

- **Repo scan** of `Qivalabstech/vibecoder-scanner` — 2 findings, both
  confirmed **false positives** on inspection (no `ANTHROPIC_API_KEY` set,
  so no AI triage to catch these automatically): a `path.join` in
  `worker/scanners/repo-scan.ts:102` flagged for path traversal (inputs
  are a hardcoded filename + a server-generated temp dir, never user
  input), and a `console.error` template literal in `worker/index.ts:238`
  flagged for format-string injection (not a real sink). Left the code
  as-is — these are exactly the kind of noise the (currently unconfigured)
  AI-analysis layer exists to filter.
- **Live-site scan** of `hakscan.online` — added it as a real site
  target, verified via a real meta tag (`SITE_VERIFICATION_TOKEN` env
  var → `<meta name="hakscan-site-verification">` in `src/app/layout.tsx`,
  removable later), and ran a real ZAP baseline. First pass: 6 real
  findings — missing CSP, anti-clickjacking header, X-Content-Type-Options,
  Permissions-Policy, CORP, and an X-Powered-By version leak.

**Fixed all of the fixable ones** in `next.config.ts`'s `headers()`:
CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
Permissions-Policy, Cross-Origin-Resource-Policy,
Cross-Origin-Opener-Policy (`same-origin-allow-popups`, not the
stricter `same-origin` — untested against PayPal's less common 3DS
popup flows), and disabled `X-Powered-By` via `poweredByHeader: false`.
Deliberately **did not** set Cross-Origin-Embedder-Policy — it would
require PayPal's cross-origin button iframe to opt in via CORP/CORS,
which it doesn't, so shipping it would break checkout to silence an
informational finding.

**Two real regressions found and fixed by testing, not skipped**:
1. The first CSP draft blocked PayPal's *sandbox* domains
   (`www.sandbox.paypal.com` is a different origin from
   `www.paypal.com`, only relevant because `PAYPAL_ENV=sandbox` here) —
   caught via actual console errors when opening the real checkout
   modal locally before pushing.
2. A follow-up "tighten img-src" commit removed the `https:` wildcard
   based on a `grep` for `<img>` finding nothing in our source — wrong,
   because PayPal's SDK injects its own logo/card-icon `<img>` tags into
   the document at runtime via JS, which a source grep can't see. Caught
   the same way: loaded the real billing page, saw real blocked-image
   console errors, fixed by scoping `img-src` to exactly
   `paypalobjects.com` instead of reverting to the wildcard.

Re-scanned `hakscan.online` after the header fixes landed: the 6 fixed
findings are gone. ZAP's re-scan surfaced new, mostly-informational
items instead — `script-src`/`style-src 'unsafe-inline'` (needed for the
inline theme-init script and styled-jsx-based VengeanceUI components;
a nonce-based CSP would remove this but is a real follow-up piece of
work, not a quick fix), COEP still absent (intentional, see above), and
3 low-severity cache-header notes (informational, not action items).

Cleaned up every test account created during this pass
(`csp-header-verify@`, `csp-imgsrc-fix-verify@`, `final-prod-check@`,
etc.) via the Supabase admin API afterward, and also caught + deleted
`paypal-sandbox-test@example.com`, a leftover from an earlier session
that never got cleaned up.

## Current state (2026-09-14, old vercel.app domain removed)

Removed `vibecoder-scanner-delta.vercel.app` from the Vercel project at
the user's request, now that `hakscan.online` is live and verified.
Remaining domains: `hakscan.online` (canonical), `www.hakscan.online`
(redirects to it), `hakscan.vercel.app` (kept as a free Vercel-provided
fallback). No env vars/webhooks/Supabase config referenced the removed
domain by this point — it was already fully migrated off in the prior
entry — so this was a clean removal with nothing left dangling.

## Current state (2026-09-14, real domain hakscan.online is live)

The user registered **hakscan.online** (Spaceship registrar) and pointed
its DNS at Vercel (`A @ → 216.198.79.1`, `CNAME www → <vercel-dns target>`).
Added both `hakscan.online` and `www.hakscan.online` in Vercel's Domains
settings. **The canonical/apex domain is `https://hakscan.online`** —
`www.hakscan.online` redirects to it, not the reverse (this was initially
assumed backwards and corrected after a live check). Updated all three
downstream places again to point at the real domain:
- `NEXT_PUBLIC_APP_URL` → `https://hakscan.online`
- PayPal sandbox webhook (`29C380051N579361W`) → `https://hakscan.online/api/billing/webhook`
- Supabase Auth Site URL → `https://hakscan.online`; both `https://hakscan.online/**` and `https://www.hakscan.online/**` are in the redirect allowlist alongside the older `hakscan.vercel.app`/`vibecoder-scanner-delta.vercel.app`/`localhost:3060` entries (none removed — extra allowlisted origins are harmless, removing a live one isn't reversible without notice)

Redeployed and re-verified live end-to-end on `hakscan.online`: real
signup, real dashboard, real PayPal subscribe button rendering. Domain
propagated fast (no waiting needed by the time this was checked).

`hakscan.vercel.app` and `vibecoder-scanner-delta.vercel.app` are both
still attached to the project as secondary domains — intentionally left
in place rather than removed, so nothing bookmarked or already configured
elsewhere (if anything ever was) breaks.

## Current state (2026-09-13, Vercel project + domain renamed to Hakscan)

Renamed the Vercel project from `vibecoder-scanner` to `hakscan`
(`qivalabstechs-projects/hakscan`, same Project ID
`prj_6imtUYuUuYwkL9XQg93D8RKo04BK`) and added `hakscan.vercel.app` as a
Production domain. **Kept** `vibecoder-scanner-delta.vercel.app` as a
secondary alias rather than removing it — both currently resolve to the
same deployment, so nothing with the old URL bookmarked breaks. Updated
every place that had the old domain hardcoded:
- Vercel env var `NEXT_PUBLIC_APP_URL` → `https://hakscan.vercel.app`
- PayPal sandbox webhook (`29C380051N579361W`) URL → `https://hakscan.vercel.app/api/billing/webhook`
- Supabase Auth (`bareloop` project) Site URL → `https://hakscan.vercel.app`, and added `https://hakscan.vercel.app/**` to the redirect URL allowlist (the old domain and `localhost:3060` are still allowlisted too)
Did **not** need to touch the GitHub OAuth App — its registered callback
is Supabase's own fixed URL (`https://oadghnzcqbefuxfyxmrw.supabase.co/auth/v1/callback`), not this app's domain, so it was never coupled to the old name.

Redeployed and verified live end-to-end on the new domain: real signup,
real dashboard, real PayPal subscribe button rendering from a real
`/api/billing/subscribe` call. `hakscan.com` (the actual purchasable
domain) is still unregistered as of this session — once the user buys
it, it can be added here the same way `hakscan.vercel.app` was, and
`NEXT_PUBLIC_APP_URL`/the PayPal webhook/Supabase Site URL would need
updating again to match.

## Current state (2026-09-13, VengeanceUI redesign pass)

Redesigned the marketing site, auth pages, and dashboard/admin chrome
using components pulled from the VengeanceUI registry (its own MCP server
failed to connect this session — used the documented GitHub-API/CLI
fallback instead of guessing component names). Installed only 6
uniquely-named leaf components (`border-beam`, `cyber-glitch-text`,
`animated-number`, `glow-border-card`, `copy-button`, `spotlight-navbar`)
after confirming several other registry names (`button`, `card`, `badge`,
etc.) would have silently overwritten this project's existing Base-UI
(not Radix) shadcn primitives — see `docs/rules.md`'s new entry.
Everything else (PayPal integration, scan logic, severity colors, the
3D-globe hero, every API route) was left untouched; only decoration
changed. Re-verified live that billing still works after the visual pass.

Found and fixed a real bug in the installed `cyber-glitch-text.tsx`: its
root element was a `<div>`, invalid inside `<p>`/`<h1>`/`<h2>` — every
place this redesign uses it. Caused a hydration crash to unstyled
light-mode HTML on first load. Fixed at the component level (all `<div>`s
→ `<span>`s) rather than avoiding the usages, since the same bug would
resurface anywhere else the component gets used.

Also found and fixed a stale `IndianRupee` icon on the admin sidebar's
Pricing link, left over from before the INR→USD switch.

**This file is a running log — update it whenever meaningful progress
happens** (a phase lands, a bug is found and fixed, a blocker shows up), not
just at setup. A memory.md only ever written once is worth nothing to the
next session.

## Current state (2026-09-12, rebrand: Vibecoder Scanner → Hakscan)

Renamed the product from "Vibecoder Scanner" to **Hakscan** at the user's
request. Domain research (WHOIS via who.is, not just search-engine
indexing) confirmed `hakscan.com` is unregistered and no existing
brand/company uses the name — `flawline.com` was the other strong
available option but the user picked Hakscan.

Renamed everywhere the old name appeared: page titles/metadata, the
marketing nav wordmark, the auth-shell and dashboard sidebar wordmarks,
the PDF report header/footer/document-title, the downloaded-report
filename, the ToS body copy, the Resend "from" display name, the worker's
temp-directory prefixes, `package.json`'s `name` field, and — functionally,
not just cosmetically — the site-ownership verification challenge strings
(`META_TAG_NAME`/`DNS_SUBDOMAIN` in `src/lib/verification.ts`, now
`hakscan-site-verification` / `_hakscan-challenge`). Safe to change since
the business report generated the same day confirmed zero real
site-verification targets exist yet, only the 2 test ones from this
session. **Did not** rename the GitHub repo (`Qivalabstech/vibecoder-scanner`)
or the Vercel project/domain (`vibecoder-scanner-delta.vercel.app`) —
those are separate, more disruptive actions (breaks existing clone URLs /
webhook URLs already registered with PayPal and GitHub OAuth) that need
their own explicit go-ahead once `hakscan.com` is actually acquired.

## Current state (2026-09-12, PayPal sandbox setup)

PayPal billing is now fully wired and verified end-to-end in both dev and
production, using real sandbox credentials (not just the graceful-failure
path):

- Created a PayPal sandbox app ("Vibecoder Scanner US"), Product, Plan
  ($24/mo USD, `P-96T49030WX671005BNKSUYSA`), and webhook
  (`29C380051N579361W`, pointed at
  `https://vibecoder-scanner-delta.vercel.app/api/billing/webhook`) via
  direct REST API calls (token exchange + `/v1/catalogs/products` +
  `/v1/billing/plans` + `/v1/notifications/webhooks`), not the dashboard
  UI — faster and scriptable.
- **Real finding, not a code bug**: the first sandbox app was built on a
  business account with country **IN**. Every subscription approval
  through it failed with PayPal's generic "We're sorry, things don't
  appear to be working" — reproduced 3x. Created a second sandbox
  business account with country **US**, a second app tied to it, and the
  identical subscription completed successfully (`ACTIVE`, real
  `$24.00 USD` charge in the sandbox ledger). This strongly suggests
  **PayPal India business accounts can't process subscriptions in
  sandbox**, mirroring the exact RBI-driven recurring-billing restriction
  that pushed this project off Razorpay in the first place. **When the
  user sets up their real (live) PayPal business account, it needs to be
  a non-India entity for subscriptions to work** — this should be
  confirmed with PayPal directly before assuming it'll work.
- All 6 `PAYPAL_*` env vars are set in **both** `.env.local` and Vercel
  production, using the working US app's credentials. Verified live on
  `vibecoder-scanner-delta.vercel.app`: a real signup → real "Upgrade to
  Pro" click → real PayPal Subscribe/Debit-card buttons rendered,
  confirming the production→PayPal round-trip actually works with these
  credentials (not just the local dev server).
- **Vercel CLI footgun discovered**: the CLI (`npx vercel`, logged in as
  `quickintelligenceva-lab`) is linked to a *different, empty*
  `vibecoder-scanner` project under team `qiva` — not the real one
  (`qivalabstechs-projects`/`vibecoder-scanner`, serving
  `vibecoder-scanner-delta.vercel.app`). Five env vars got added to that
  wrong/unused project before this was caught. **Don't trust `vercel env
  add`/`ls` in this repo without first confirming `vercel whoami` +
  `vercel project ls` matches the actual deployed project** — use the
  Vercel dashboard (logged in as `tech@qivalabs.com`) for anything
  touching the real `vibecoder-scanner-delta` deployment instead.
- Triggered a manual Redeploy (no code changes) from the Vercel dashboard
  so the new env vars actually took effect — env var changes alone don't
  redeploy automatically.

## Current state

All 8 phases from the original spec are built. As of 2026-09-11 the app is
**live in production**: Next.js app on Vercel
(`https://vibecoder-scanner-delta.vercel.app`, team `qivalabstechs-projects`,
repo `github.com/Qivalabstech/vibecoder-scanner`, public), the scan worker
on a DigitalOcean droplet (Bangalore, systemd-managed), Redis via Upstash
shared between both, and the database is a **different Supabase project
than earlier sessions used** — see the 2026-09-11 log entry for why and
exactly what changed. GitHub OAuth is fully wired against this current
Supabase project (verified: the flow reaches GitHub's real authorize
screen with the correct redirect target). The core security model
(ownership gate, billing, every table's write privileges) is fixed by
migration `0007`, re-applied cleanly to the new project. The one item that
remains genuinely open, and cannot be closed by an AI session, is real
legal counsel reviewing and signing off on the Terms of Service — see
`phases.md` → Phase 8 for the exact wording of that caveat.

On 2026-09-12, a full visual redesign landed (see that log entry) — dark
"operator console" identity replacing the earlier generic-SaaS violet
palette, plus a real scan-in-progress animation replacing a static
placeholder.

Also on 2026-09-12: end-to-end signup (email/password and GitHub OAuth)
was tested live in production and both work — a real confirm-email bug
was found and fixed in the process (Supabase's "Confirm email" toggle was
on with no SMTP configured, 500ing every signup; turned off in Supabase
Dashboard → Authentication → Sign In/Providers). The billing (Razorpay)
flow was also tested live: clicking "Upgrade to Pro" correctly surfaces
"Billing isn't configured yet." with no crash, since `RAZORPAY_*` env vars
are still unset — this is the code behaving correctly, not a bug.
Displayed pricing was switched from INR to USD per request: migration
`0009_pricing_usd.sql` (applied directly to the live `bareloop` DB via the
Supabase SQL editor, with explicit user confirmation since it's a
destructive drop-column) replaces `pricing_config.pro_price_inr` with
`pro_price_usd numeric(10,2)`, set to `24`. Every reader/writer of that
column (`src/app/page.tsx`, `pricing-teaser.tsx`, both admin pricing
files, `admin/page.tsx`'s MRR estimate) was updated to match, and the
admin pricing page's warning banner now also states that actually
billing in USD requires Razorpay International/multi-currency to be
enabled on the merchant account — a Razorpay-dashboard KYC step outside
what this session can configure, same category of limitation as
`RAZORPAY_PLAN_ID` itself.

## In progress

Nothing actively in progress.

## Open items / known gaps

- **Auth, targets, the authorization gate, database write privileges, the
  free-tier limit, scan-tool execution (ZAP), and PDF report generation are
  all now verified against real infrastructure** (see the 2026-08-28,
  2026-08-30, and 2026-09-01 log entries) — not mock data. Still
  unverified: Semgrep/Gitleaks (the repo-scan path — needs a real GitHub
  OAuth App + a repo, neither available here) and the Claude/Resend/
  Razorpay integrations (no real API keys for any of them).
- **Local Docker Supabase's daemon is intermittently unresponsive** and
  disk on this host keeps drifting back to near-zero free even after being
  freed — hit actual `ENOSPC` (system-wide, tool output writes failing)
  while applying `0007` to local, recovered by clearing
  `~/Library/Caches` again (12GB → freed) and restarting Docker Desktop a
  second time. `redis:7-alpine` and the `edge-runtime` container didn't
  come back up after that restart (existed but stopped, not
  auto-restart-policy'd) — fixed with `docker start vibecoder-redis
  supabase_edge_runtime_vibecoder-scanner`; all 13 local containers
  (12 Supabase + Redis) are healthy again as of right after. Migration
  `0007` IS now confirmed-applied to local too (re-verified with the same
  `has_table_privilege` checks after the container restart cycle — the
  grants persisted, as expected, since they live in Postgres's catalog,
  not container state). If local Docker becomes unresponsive again, the
  fix that's worked twice now: quit Docker Desktop (`osascript -e 'quit app
  "Docker"'` + `pkill -9`), free host disk if `docker version` shows only
  client info with no server response, relaunch (`open -a Docker`), wait
  for `docker info` to succeed.
- No customer-facing billing portal beyond upgrade/cancel.
- `docs/` was seeded retroactively after Phases 0–7 already existed — if
  anything below drifts from the code, trust the code and fix this file.

## Log

- **2026-08-24** — Phases 0–7 built in sequence this session (and prior
  sessions in this conversation): design system + 3D hero, auth, ownership-
  verification gate, Docker-sandboxed scan workers, Claude AI analysis
  layer, findings dashboard, PDF reports + email notifications + scheduled
  re-scans, Razorpay billing. During Phase 7, found and fixed a real
  pre-existing gap: `targets.verified` and `users.plan` had no column-level
  write protection — RLS's "own row" policies only check row ownership, so
  a logged-in user could have called the Supabase client directly from
  devtools to self-verify a target or self-upgrade their plan, bypassing
  both the core legal requirement and billing entirely. Fixed via
  `supabase/migrations/0005_lock_down_client_writes.sql` (column-level
  `REVOKE UPDATE ... FROM authenticated`) plus switching
  `/api/targets/[id]/verify`'s actual write to the service-role client.
  `docs/` scaffold seeded at the end of this session. Ran a ponytail
  (simplicity) pass over billing/queue/scanner code afterward: trimmed
  `src/lib/queue.ts` and `src/lib/razorpay.ts`'s lazy-singleton boilerplate
  and a per-call temp `Queue` in `worker/index.ts` — but the first attempt
  went too far (eager top-level `new Razorpay(...)` / `new IORedis(...)`)
  and broke `next build` outright, since Next executes route modules during
  "Collecting page data" and Razorpay throws synchronously on a missing
  `key_id`. Caught by actually running the build, not by inspection —
  reverted to lazy init. Lesson: verify every "simplification" the same way
  the original code was verified; a change that looks obviously safe in a
  billing/queue module still needs the build run, not just typecheck+lint.
  Then ran a design-taste-frontend audit over the landing/auth pages (per
  docs/design.md's real tokens, not re-derived). Fixed real violations:
  removed an em-dash-laden trust tagline crammed below the hero CTAs
  (already redundant with step 1 of "How it works"), capped hero top
  padding, swapped `auth-shell.tsx`'s `min-h-screen` for `min-h-[100dvh]`
  (mobile Safari address-bar stability), rewrote "How it works" from three
  identical feature cards with "1./2./3." labels (an explicitly named
  AI-slop pattern) into a connected numbered-step layout, and removed
  em-dashes from all user-visible copy site-wide. Verified via a fresh
  browser tab (the reused dev tab had stale accumulated console/network
  logs from earlier in the session — a recurring gotcha in this
  environment, always open a new tab before trusting "no errors").
  Closed out the one remaining Phase 7 gap: paid-user scan jobs now enqueue
  unprioritized (BullMQ's actual fast lane — see comment in
  `src/lib/queue.ts`) while free-user jobs get an explicit low priority, so
  paid scans jump the queue ahead of free ones. Also caught and fixed a
  drift bug in this pass: `README.md` had never been updated for Phase 7 at
  all (still said "Phase 0-6... Razorpay billing not built yet" despite
  billing being fully implemented) — a reminder that "update the docs" is
  easy to silently skip when a phase ships without a dedicated pass at the
  end of it. Then built Phase 8: `worker/lib/abuse-monitor.ts` reads
  `audit_log` on a 15-minute interval (plain `setInterval` in the
  already-long-running worker process, not a second BullMQ queue) and
  emails `ADMIN_EMAIL` on a denial burst; expanded
  `src/app/legal/terms/page.tsx` into a full draft covering the standard
  clauses (billing, third-party processors, liability, termination, etc.)
  with a visible "pending legal review" banner, since actual legal sign-off
  is the one thing in this whole project that genuinely cannot be finished
  by an AI session. All 8 phases from the original spec are now built.

- **2026-08-28** — Set up a real local Supabase stack (`supabase init` +
  `supabase start`, Docker) and tested end to end for the first time,
  rather than mock data. Hit real infrastructure trouble along the way,
  worth remembering: the host had only ~5GB free disk, which made Docker
  Desktop's VM disk go read-only mid-pull and corrupt its local
  content-addressable image store (`docker ps` hung indefinitely
  afterward — not "slow," genuinely stuck). Fixed by clearing `~/.npm` +
  `~/Library/Caches` (freed ~23GB), restarting Docker Desktop, and running
  `docker system prune -af` to clear the corrupted blobs before retrying.
  Docker's virtual disk does not shrink back after a prune, so disk stayed
  tight (dropped to ~1.4GB free) for the rest of the session — safe for
  Postgres/Redis/small images, not safe for the ZAP/Semgrep images a real
  scan needs, so I stopped short of testing actual scan-tool execution
  rather than risk a repeat corruption of the now-live Supabase containers.
  What *did* get verified, for real:
  - Signup → real Supabase Auth → `handle_new_user()` trigger → `public.users`
    row created correctly.
  - **Found and fixed a real bug this way**: `SignupForm` always showed
    "check your inbox" even when `enable_confirmations = false` meant
    `signUp()` already returned an active session — the user was silently
    already logged in behind a message telling them to go check email that
    was never sent. Now checks `data.session` and routes straight to the
    dashboard when one exists.
  - **Found and fixed a much bigger one**: adding a target failed with
    `permission denied for table targets` — turned out RLS policies alone
    were never enough. Postgres checks table-level GRANTs before RLS runs,
    and migrations 0001–0004 never issued any; the `authenticated` and
    `service_role` roles had zero SELECT/INSERT/UPDATE/DELETE on *any*
    table in this project, on any environment, since the day they were
    created. This would have silently broken the entire app — not just
    locally — the first time anyone pointed it at a fresh Supabase project.
    Fixed with migration `0006`, deliberately using column-level `GRANT
    UPDATE (scan_frequency)` rather than a table-level `GRANT UPDATE`, to
    avoid quietly re-enabling the columns `0005` had revoked. Verified this
    distinction empirically, not just reasoned about: `has_column_privilege`
    checks, a real `UPDATE` attempt as the `authenticated` role via
    `SET ROLE`, and — most convincingly — a raw `curl PATCH` against the
    live PostgREST API using a real logged-in user's JWT, replicating the
    exact devtools attack the whole gate exists to prevent: attempting to
    set `targets.verified = true` returns `403 permission denied`, while
    the same call setting `scan_frequency` returns `200 OK`.
  - The full authorization gate end to end: added a live-site target
    against a throwaway local test server, verified it via the real
    meta-tag HTTP check (not DNS — no real DNS to control), watched
    `verified` flip to `true` and `audit_log` record both the pending and
    success events with correct metadata.
  - Free-tier 1-target limit: adding a second target correctly 402'd with
    "Free plan allows 1 target."
  - Scan trigger → BullMQ enqueue → worker pickup, confirmed via the
    `bull:scans:*` keys in Redis and the scan row transitioning
    `queued → running`. Killed the in-flight ZAP container pull to protect
    the disk before it could complete — the resulting `failed` status,
    `audit_log` entry, and `/scans/[id]` UI all rendered correctly, which
    is itself a reasonable proxy for "the failure path works," even though
    a successful scan was never observed.
  - Billing page renders real plan state from the database correctly.
  - GitHub OAuth / repo-scan path remains untested — needs a real GitHub
    OAuth App and a repo, neither of which exist in this environment.

  Also hit `ENOSPC` (disk completely full) mid-`next build` near the end of
  this — the failed build had left a partial `.next/` that itself ate
  ~1.3GB; deleting it recovered enough to finish cleanly. Host disk settled
  around 2GB free. Left the local Supabase stack running (all 12 containers
  healthy) per explicit choice, rather than tearing it down, so testing can
  continue without re-pulling ~6GB of images. `.env.local` currently points
  at this local stack (`http://127.0.0.1:54321`), not placeholder values —
  swap back to a real project's credentials (or re-placeholder) before
  trusting `.env.local.example`'s guidance at face value.

- **2026-08-30** — User switched to a real hosted Supabase project
  (couldn't free more local disk). Ran all 6 migrations directly via
  `psql` against the hosted Postgres connection (not `supabase link` —
  simpler, no OAuth needed, just the DB password). All applied cleanly,
  first try, on totally independent infrastructure from the local Docker
  test — a genuinely good sign for the migrations themselves.

  Then re-ran the same "attack the live API as a logged-in user" test from
  the 2026-08-28 session, expecting it to just confirm what was already
  fixed. **It didn't hold.** `has_column_privilege` and a real `SET ROLE`
  `UPDATE` both showed `authenticated` could still write `targets.verified`
  and `users.plan` on hosted, despite migrations `0005`/`0006`. Checked
  further and found the actual cause: hosted Supabase grants
  `authenticated` broad table-level `INSERT`/`UPDATE`/`DELETE` on every
  table by default, independent of this project's migrations — and a
  column-level `REVOKE` (what `0005` did) **does not override a coexisting
  table-level `GRANT`** in Postgres. `0006`'s column-scoped `GRANT` had been
  written and verified against *local*, where no such pre-existing grant
  exists — so it happened to work there and silently didn't transfer.

  Confirmed the real severity with two live attacks against the hosted
  PostgREST API, using a real logged-in test user's JWT (extracted from the
  actual browser session cookie, not fabricated):
  - `POST /rest/v1/targets` with `verified: true, authorization_attested:
    true` → **201 Created**. A complete bypass of the ownership-verification
    gate — the one thing the build brief called "non-negotiable."
  - `PATCH /rest/v1/users?id=eq....` with `plan: "paid"` → **200 OK**. A
    complete billing bypass.
  - Checked every other table for the same pattern while in there:
    `scans`, `findings`, `audit_log`, `github_connections` all had
    unrestricted `INSERT`/`UPDATE`/`DELETE` for `authenticated` too — fake
    scan results, a tampered or erased audit trail, and a hijacked GitHub
    connection reference were all sitting open.

  Fixed with migration `0007`: `REVOKE INSERT, UPDATE, DELETE` outright
  from `authenticated` on every table (removing whatever ambient grant
  existed, regardless of source), then `GRANT` back exactly one thing —
  `UPDATE (scan_frequency)` on `targets`. Everything else moved to the
  service-role client: `src/app/api/targets/route.ts` (both the repo and
  site branches' `.insert()`) and `src/app/api/targets/[id]/scan/route.ts`
  (the scan-row `.insert()`) no longer use the RLS-scoped client for
  writes at all. Re-ran both attacks after applying `0007` — both now
  `403 permission denied`, as designed. Then re-ran the *legitimate* flow
  end to end (real signup, target creation, meta-tag verification) against
  hosted to confirm the fix didn't also break what should work — it didn't.

  Applied `0007` to hosted successfully; attempted to also apply it to
  local for parity, but local's Docker containers had gone unresponsive by
  that point (see Open items) — deferred, not urgent now that hosted is
  primary.

  **The lesson, stated plainly**: a security fix that was reasoned about
  carefully, and empirically verified — against one environment — was still
  wrong, because "empirically verified" only covers the environment you
  verified it in. Two different Supabase environments had opposite default
  states for the exact same migrations. Don't trust a database security
  fix until it's been attacked on the actual environment real users will
  hit, and re-attacked after any change that touches privileges.

- **2026-09-01** — User asked to also apply `0007` to local (it had been
  deferred). Local Docker was unresponsive again — this time a genuine
  system-wide `ENOSPC` (tool output writes themselves failing, not just
  `docker` commands). Recovered the same way as before: clear
  `~/Library/Caches` (freed it back to 12GB), restart Docker Desktop.
  `0007` applied to local cleanly on retry, and stayed applied across a
  second unrelated restart later in the session (grants live in Postgres's
  catalog, confirmed persistent as expected). `redis:7-alpine` and the
  `edge-runtime` container had stopped (not auto-restart-policy'd) — fixed
  with `docker start vibecoder-redis supabase_edge_runtime_vibecoder-scanner`
  rather than a full `supabase start`/re-pull, since the containers still
  existed, just stopped.

  Then ran the scan trigger end to end for the first time in this whole
  project's testing history, and **it worked**: real signup session,
  `POST /api/targets/[id]/scan` → BullMQ → the local worker → a real
  `docker run zaproxy/zap-stable zap-baseline.py` against the throwaway
  local test site (whose IP had drifted *again* — this sandbox's `en0`
  address changes somewhat often; worth expecting, not surprising, in this
  environment specifically) → 9 real findings written to `findings`
  (missing security headers, exactly what you'd expect scanning a bare
  `python -m http.server` page) → `scans.status` → `done` → the `/scans/
  [id]` UI rendering them grouped by severity, badge and all → the "PDF
  report" button appearing (only shown when `status === "done"`) → an
  actual `GET /api/scans/[id]/report` returning a real, valid
  `application/pdf` blob. This is the first time any of the scan-execution
  → findings → report pipeline had been observed working, as opposed to
  code-reviewed; every earlier phase's "done" only covered up to the
  Docker pull attempt.

  Caught one more real bug from actually looking at the output: ZAP's
  `desc`/`solution` fields carry HTML markup meant for its own report
  renderer (`<p>...</p>`), and the raw-finding fallback (shown until AI
  analysis rewrites it) was printing those tags literally as visible text.
  Fixed with a small `stripHtml()` in `worker/scanners/site-scan.ts`.
  Re-ran the scan (fast this time — the 3.6GB ZAP image was already
  cached) and confirmed the fix in both the raw DB rows and the rendered
  page.

  AI analysis was correctly skipped throughout (no `ANTHROPIC_API_KEY` in
  this environment) — the `scan.ai_analysis_skipped` audit_log entry and
  the "hasn't been analyzed by AI yet" UI message both fired exactly as
  designed, and the scan still completed and produced a usable report with
  raw findings. That degrade-gracefully design decision from Phase 4 held
  up under an actual failure condition, not just a hypothetical one.

  Remaining unverified: the repo-scan path (Semgrep/Gitleaks, GitHub OAuth)
  — needs a real GitHub OAuth App and a repo to scan, neither available
  here — and the Claude/Resend/Razorpay integrations, which have no real
  keys in this environment.

- **2026-09-11** — Deployed to real infrastructure end to end: worker on a
  DigitalOcean droplet (Bangalore, $6/mo, systemd unit
  `vibecoder-worker.service`, Docker + Node 22 + git installed directly on
  the host since it needs to spawn sibling scanner containers), Redis
  moved from local-only to a shared Upstash instance so the VPS worker and
  whatever runs the Next.js app can enqueue/consume the same queue, and
  the app itself deployed to Vercel
  (`vibecoder-scanner-delta.vercel.app`, team `qivalabstechs-projects`,
  the real `tech@qivalabs.com` account — not the two other Vercel/GitHub
  identities this session touched along the way while sorting out which
  account actually owned what). Code pushed to a new GitHub repo,
  `github.com/Qivalabstech/vibecoder-scanner` (public).

  Verified the whole pipeline for real before calling it done: pointed
  local dev at the Upstash Redis, triggered a scan through the actual UI,
  and watched the VPS worker (via `journalctl`) pick up the BullMQ job,
  run a real `docker run zaproxy/zap-stable` against a throwaway test
  server hosted on the VPS itself (the original target was a private
  10.x address on this sandbox, unreachable from a public VPS — spun up a
  temporary `python -m http.server` on the droplet's own public IP,
  pointed the target's `identifier` at it via trusted DB access, scanned
  it, then reverted the identifier and tore the test server + firewall
  rule down afterward), and produced 9 real findings end to end.

  **Also swapped the Supabase project mid-session.** The original
  `pyrjntehpqehchxluaws` project referenced everywhere in earlier
  sessions turned out to belong to a Supabase account nobody in this
  session had login access to — checked every account/token available
  (browser logins, the Supabase CLI's own stored credential, which
  belongs to yet a third account) and none of them could reach it, so
  there was no way to configure its GitHub OAuth provider. The user
  decided to stop hunting for the old account and just use a project they
  did have fresh access to instead (`bareloop`,
  `oadghnzcqbefuxfyxmrw.supabase.co`, under `demoqiva@gmail.com`) — it had
  been paused; resumed it, re-ran all 7 migrations against it clean (no
  errors), and repointed every environment (`.env.local`, Vercel, the VPS
  worker's `.env`) at the new URL/keys. Also created a fresh GitHub OAuth
  App (`Vibecoder Scanner`, owned by `Qivalabstech`, since the old one's
  callback pointed at the now-unreachable project) and wired it into the
  new project's Auth → Providers → GitHub, plus added the production
  domain to Supabase's redirect-URL allowlist. Confirmed working up to
  GitHub's own "Authorize" screen showing the correct redirect target
  (`oadghnzcqbefuxfyxmrw.supabase.co`) — the final click needs a human,
  since GitHub's authorize button is disabled behind a bot-detection
  script that a scripted click legitimately can't (and shouldn't try to)
  get past.

  Note: the `bareloop` project had pre-existing, unrelated tables
  (`founders`, `mrr_snapshots`, `razorpay_credentials`) from whatever it
  was used for before — left untouched, not vibecoder-scanner's data.

  Lesson worth keeping: this repo's Vercel dashboard UI was unreliable for
  scripted interaction all session (buttons with real, non-disabled
  onClick handlers that silently no-op on synthetic clicks; a background
  request-storm that triggered real 429s and made pages appear to load
  with stale/empty data). The reliable pattern that worked every time:
  add environment variables **one at a time** (batching multiple in one
  "Add Environment Variable" form silently failed to save, even though no
  validation error was ever shown), and take a fresh screenshot
  immediately before every click rather than reusing an old one, since
  the page kept re-rendering between actions.

- **2026-09-12** — Full visual redesign to a dark "operator console"
  identity (the user asked for something that reads as an elite
  hacking/pentest team's own site, not generic security SaaS), plus a
  real scan-in-progress animation. Followed the razamdesign
  Direction→Motion→Build→Verify flow, compressed to fit the session:
  loaded `frontend-design` for the direction pass, made the palette/type
  decisions directly (documented in `design.md`) rather than also loading
  every referenced sub-skill, then built and verified in-browser.

  Changes: primary accent moved from violet (~280° OKLCH) to phosphor
  terminal-green (~152°), with that hue leaking faintly into all dark-mode
  neutrals rather than sitting alone on gray; `--font-heading` repointed
  from sans to Geist Mono, which retroactively restyled every existing
  `font-heading` usage (shadcn Card/Dialog titles) for free; border radius
  cut from `0.75rem` to `0.4rem`; added `.scanlines` and `.console-grid`
  CSS-only texture utilities. New `ScanProgressAnimation` component
  replaces the static "scan in progress" placeholder on `/scans/[id]` —
  a terminal-feed of plausible in-flight steps (different copy for
  `repo` vs `site` targets) plus a radar-sweep icon, explicitly labeled to
  the reader as illustrative rather than real log tailing, since the
  worker doesn't stream live output to the browser. Added a shared
  `TypedText` typewriter component, used for a boot-sequence line in the
  hero. Severity colors, the 3D globe's geometry/behavior, and all
  component logic were left alone — this was a restyle, not a rebuild.

  Caught one real bug while building: an earlier version of the
  `.console-grid` utility applied its fade mask directly to the hero
  `<section>`, which meant the mask (meant only for a decorative grid
  layer) also faded out the real heading/paragraph text stacked in front
  of it. Fixed by moving the grid to a `::before` pseudo-element, matching
  the pattern `.scanlines` already used — verified by screenshot before
  and after.

  Verified in-browser: landing page (hero, nav, boot line), scan detail
  page in both `queued`/`running` (temporarily flipped a real scan's
  status via trusted DB access to see the animation live, then reverted
  it) and `done` states with real findings, and the dashboard overview.
  No console errors. Did not run a full accessibility/contrast audit pass
  or the dedicated `find-animation-opportunities`/`improve-animations`
  skills separately — worth a follow-up if the user wants that level of
  rigor.

- **2026-09-12 (later same day)** — Follow-up feedback: the scan-in-
  progress animation looked fake ("repeating the same thing"), the PDF
  report wasn't properly branded or actionable, and a super-admin/CRM
  panel was requested. Shipped all three:

  **Scan animation rebuilt from scratch.** The old version looped a fixed
  set of log lines forever while a scan stayed `running`, which read as
  obviously fake since it visibly repeated. Replaced with
  `ScanProgressAnimation` (`src/components/dashboard/scan-progress-
  animation.tsx`): a vertical stage tracker (4 stages, different copy for
  repo vs site targets) that only ever moves forward, driven by real
  elapsed time since the scan's actual `started_at` timestamp — not a
  fake timer that restarts. A live elapsed-time counter ticks against
  that same real timestamp. The active stage's pulse and the connecting-
  line fill are CSS (`@keyframes scan-pulse` in `globals.css` +
  `transition-colors`), not JS-animated per frame. Verified by flipping a
  real scan to `running` with a `started_at` set 25s in the past via
  trusted DB access, confirming the stage/timer both advanced correctly
  over real wall-clock time, then reverting the scan to its real state.

  **PDF report redesigned** (`src/lib/pdf-report.tsx`): fixed header
  (brand mark + "VIBECODER SCANNER" + "Confidential security report") and
  footer (company name, scan ID, real page-X-of-Y via `@react-pdf/
  renderer`'s `render` prop) on every page, a proper cover section
  (finding counts, critical+high count, scan type), and — the actual
  "steps to clear the issues" ask — each finding's fix now renders as a
  numbered step list via a new `parseFixSteps()` helper
  (`src/lib/parse-steps.ts`), reused in the dashboard's `FindingCard` too.
  Also updated `worker/lib/claude-analysis.ts`'s prompt to ask Claude for
  numbered steps specifically, for future scans (existing findings in the
  DB predate that prompt change and don't have `ai_fix_suggestion` set at
  all, since this environment has no `ANTHROPIC_API_KEY` — the parser
  still degrades fine for old free-text values once a key is added).
  Verified by actually fetching a real report from the live dev server,
  base64-decoding the response, and rendering it to PNG with `pdftoppm`
  (installed via `brew install poppler` for this) to look at it — not
  just checking the HTTP status.

  **Super admin console added** (`/admin`, Phase 9 in `phases.md`).
  Membership is `SUPER_ADMIN_EMAILS`, an env-var allowlist checked by
  `isSuperAdminEmail()` — deliberately not a database column, to avoid
  needing to solve "who can grant admin" as its own privilege-escalation
  problem. New `pricing_config` table (migration `0008`, applied to the
  live `bareloop` project) holds an admin-editable *display* price for
  the marketing page; actual Razorpay billing is unaffected; the admin
  pricing page says so explicitly and gives the exact steps to change the
  real billed amount (Razorpay plans are immutable — make a new one,
  point `RAZORPAY_PLAN_ID` at it). The overview page shows real counts
  (total/free/paid users, verified targets, scans by status, a users
  table, a real `audit_log`-backed activity feed) — no placeholder data.
  Super admins bypass the free-tier 1-target limit in
  `POST /api/targets`. Verified end to end locally: added
  `waitji2026@outlook.com` to `SUPER_ADMIN_EMAILS`, confirmed the
  overview page's numbers matched the real DB, changed the displayed
  price to ₹2,499 through the admin UI and confirmed it appeared on the
  live landing page, then reverted it to ₹1,999.

  Not yet pushed to GitHub/Vercel as of writing this entry — do that next
  and re-verify against production once deployed (the `pricing_config`
  migration and `SUPER_ADMIN_EMAILS` env var both need to exist on
  production too, not just local dev).

- **2026-09-14 (continued)** — Switched the AI-analysis layer from Claude
  to OpenAI (`gpt-4o-mini`, `worker/lib/ai-analysis.ts`, see the code
  history for the full swap) and verified it for real with a live key,
  not just a graceful-degradation check:
  - Added a real `OPENAI_API_KEY` to local `.env.local`, restarted
    `worker:dev`, and called `analyzeFindings()` directly with a synthetic
    finding — got back a real, correctly-reasoned `gpt-4o-mini` response
    (marked it a false positive with a plausible explanation/fix).
  - Re-ran the actual dogfooding scan from the entry above
    (`Qivalabstech/vibecoder-scanner`, via Semgrep+Gitleaks in Docker) with
    the real key wired in. Confirmed via `audit_log`: the new scan's
    `scan.complete` entry shows `"aiAnalyzed": true`, versus the earlier
    pre-key scan's `"aiAnalyzed": false` — and both known findings
    (`path-join-resolve-traversal`, `unsafe-formatstring`) came back
    correctly marked as false positives by the AI and were deleted from
    the findings table, exactly matching the manual analysis above. The
    OpenAI integration is confirmed working end-to-end, not just
    "compiles and doesn't throw."
  - **Still open**: production's worker (the DigitalOcean droplet running
    `vibecoder-worker.service`, per the 2026-09-11 entry) has not yet had
    `OPENAI_API_KEY` added to its env — this session has no SSH
    credentials for that droplet, so it's blocked on the user providing
    them (or doing it themselves: add the key to whatever env file the
    systemd unit loads, then `systemctl restart vibecoder-worker`).
    Vercel does **not** need this key — `analyzeFindings` is only ever
    called from `worker/index.ts`, never from any Next.js route.
  - Re-ran both scans again shortly after (repo `Qivalabstech/vibecoder-scanner`
    and a fresh live-site scan of `hakscan.online`) to confirm the clean
    state holds. Repo: still 0 real findings (same 2 known false positives,
    re-confirmed and removed). Site: 7 raw ZAP findings this time (down
    from 8-11 in earlier pre-header-fix scans — the CSP/security-header
    work already closed the real gaps), AI correctly triaged all 7 as
    false positives/duplicates, 0 real findings remain. Both the repo and
    the live site are currently clean per the product's own scan.

- **2026-09-14 — Upstash Redis free-tier quota hit.** Upstash emailed that
  the `Vibecoder Scanner` database hit its free-tier cap of 500,000
  commands/month. Traced the cause: **not** this session's local dev/test
  activity — `.env.local`'s `REDIS_URL` points at a local Docker Redis
  (`redis://localhost:6379`, started via `docker-compose.yml`), completely
  separate from Upstash, so hours of local `worker:dev` testing today
  (including a stretch where a stuck Docker Desktop VM left the worker
  idling) never touched the Upstash quota at all. The real cause is almost
  certainly the **production droplet worker**, which has been running
  continuously since 2026-09-11 (per that entry) — BullMQ's built-in
  stalled-job check polls Redis roughly every 30s for as long as the
  worker process is alive, 24/7, independent of real scan volume, and
  several days of that plus whatever real `enqueueScan` traffic hit the
  Vercel app easily adds up to 500k. No code bug found (no stray
  `QueueEvents` listener, no obviously-misconfigured polling interval) —
  this is just the real, expected cost of an always-on BullMQ worker
  against a free-tier Redis, and it will recur every month at this usage
  level. **Recommendation given to the user**: upgrade Upstash to its
  pay-as-you-go plan before relying on this for real customers — usage-
  priced, expected to be a few dollars/month at any reasonable early
  scale, and avoids scans silently failing mid-month if the free quota
  is hit again. This requires adding a payment method, which only the
  user can do (Upstash Console → database → Upgrade).

- **2026-09-14 — Closed out both production blockers for real, with SSH
  access.** The user added an SSH key via DigitalOcean's Web Console
  (browser-based console access, no prior SSH key existed on the client
  machine) and gave the go-ahead for direct production changes.
  - **Droplet code was stale.** `/opt/vibecoder-scanner` on
    `vibecoder-scanner-worker` (143.110.251.145, BLR1) had no git repo —
    it had been deployed via a one-off file copy — and was still running
    the pre-swap Claude code (`worker/lib/claude-analysis.ts`,
    `@anthropic-ai/sdk` in `package.json`). Fixed properly instead of
    just patching around it: stopped the service, moved the old directory
    aside (`/opt/vibecoder-scanner.old.<timestamp>`, not deleted),
    `git clone`d the public GitHub repo fresh into `/opt/vibecoder-scanner`,
    restored the `.env` (backed up first to `/root/vibecoder-scanner.env.bak`),
    `npm install`ed, and restarted. The droplet now has a real git
    history — future deploys are a `git pull` + `npm install` +
    `systemctl restart vibecoder-worker`, not another manual copy.
    `OPENAI_API_KEY` was set in that `.env` (replacing the old blank
    `ANTHROPIC_API_KEY` line) in the same pass.
  - **Confirmed the Upstash pay-as-you-go upgrade actually fixed the
    quota error.** Right after the upgrade, the worker's `journalctl`
    output — which had been spamming `ERR max requests limit exceeded`
    on every `bzpopmin`/`evalsha` call in a tight retry loop for as long
    as it had been broken — went completely silent, confirmed clean for
    15+ seconds and staying that way.
  - **Final end-to-end proof, not just component checks**: enqueued a
    real scan (`fa08e7c7-fa7f-40a8-b0af-a882a71d53e7`) directly onto the
    production Upstash queue against the live `hakscan.online` target,
    the same queue the droplet's `vibecoder-worker.service` listens to.
    Watched the droplet pick it up (`docker inspect` confirmed a real
    `zaproxy/zap-stable` container starting at 12:03:43 UTC), run for
    ~2 minutes, and complete. `audit_log`'s `scan.complete` entry:
    `"aiAnalyzed": true, "findingCount": 7`, 0 findings remaining after
    AI triage — identical shape to the local dev verification. This is
    the real production pipeline (droplet worker + Upstash + OpenAI)
    working end-to-end, not a local simulation of it.
  - Both blockers tracked above (`OPENAI_API_KEY` on production, Upstash
    quota) are now closed. Still open: PayPal sandbox→live and the Terms
    of Service legal review — both require the user directly (PayPal
    business KYC, an actual lawyer) and can't be closed by an AI session.

- **2026-09-14 — PayPal flipped to live and verified for real.** User
  created a real live PayPal app + a live `$24/mo` "Pro Plan" subscription
  plan (`total_cycles: 0`, unlimited — matches the app's no-deferred-
  cancellation design) + a live webhook subscribed to exactly the 5 event
  types `src/app/api/billing/webhook/route.ts` actually handles
  (`BILLING.SUBSCRIPTION.ACTIVATED`, `PAYMENT.SALE.COMPLETED`,
  `BILLING.SUBSCRIPTION.CANCELLED`, `BILLING.SUBSCRIPTION.EXPIRED`,
  `BILLING.SUBSCRIPTION.SUSPENDED`).
  - Verified the live plan's actual price via the live PayPal API before
    trusting it (same pattern as the earlier sandbox check): fixed price
    really is `$24.00 USD`/month, `status: ACTIVE`.
  - Updated all 6 PayPal-related env vars in Vercel production
    (`PAYPAL_ENV=live`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`,
    `PAYPAL_PLAN_ID`, `PAYPAL_WEBHOOK_ID`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`)
    via the dashboard (Vercel's env-var edit textarea silently appends
    rather than replaces if you type before its async load finishes —
    hit this once, caught it by screenshotting before saving, fixed with
    a triple-click-to-select-all instead of relying on Cmd+A timing) and
    redeployed.
  - **Real end-to-end proof, not just "it deployed"**: logged into
    `hakscan.online/settings/billing` as `tech@qivalabs.com` and clicked
    "Upgrade to Pro" for real. First click hit `POST
    /api/billing/subscribe → 401 unauthorized` — investigated rather than
    ignored, but a clean reload + a second click succeeded (`200`,
    real subscription id `I-BKYL586D78YH` created via the live API), and
    the PayPal button rendered correctly with zero CSP/console errors.
    Concluded the 401 was a one-off session-refresh timing glitch on the
    first request after a fresh login, not a code bug — worth watching
    for recurrence, not worth chasing further on a single instance.
    Deliberately did **not** click through the actual PayPal button to
    approve the subscription — that would be a real charge, left for the
    user to trigger intentionally with their own card.
  - Remaining before a real public launch: only the Terms of Service
    legal review (`docs/rules.md`'s "draft, pending legal review" banner)
    — every infra/billing blocker tracked in this file is now closed.

- **2026-09-14 — Real brand kit wired in, replacing the lucide `ShieldHalf`
  placeholder logo everywhere.** User supplied a full brand kit
  (`~/Downloads/Hakscan-Brandkit/`: svg/png marks and wordmarks, a
  ready-made favicon set at every standard size, brand fonts). Installed
  `favicon.ico`/`icon.png`/`apple-icon.png` via Next's App Router file
  convention (drop into `src/app/`, auto-detected, no `layout.tsx`
  metadata changes needed) and copied the icon-only mark SVG to
  `public/brand/mark.svg`, then swapped it in for every `ShieldHalf`
  usage that was standing in for the brand logo (marketing nav, footer,
  dashboard sidebar, admin sidebar, both auth-shell spots) — left the
  unrelated `ShieldCheck` "verified" badge icons on target cards alone,
  those aren't the logo. Verified visually in the browser (nav + login
  page render correctly, zero console errors) and confirmed via `curl`
  that the favicon files actually serve the new byte-for-byte assets, not
  a cached default. **Not yet done, flagged for later**: the brand kit
  also includes real brand fonts (JetBrains Mono weights) and full
  horizontal/stacked wordmark lockups (SVG text baked in at "JetBrains
  Mono") — the site currently loads Geist Sans/Mono instead, so those
  wordmark assets would render with a font mismatch if used as-is.
  Swapping the site's typography to match the brand kit's fonts is a
  separate, bigger decision than "install the logo" and wasn't done here.

- **2026-09-14 (continued) — Font swap done too.** Brand guidelines
  (`Hakscan-Brand-Guidelines.html`) are explicit: "One typeface, three
  weights" — JetBrains Mono for both headings and body, deliberately not
  paired with a second sans font ("reads as a tool built by engineers,
  for engineers"). Loaded the three brand font files
  (`src/app/fonts/jbm-{regular,medium,bold}.ttf`) via `next/font/local`
  under one `--font-jbm` variable, replacing the Geist Sans + Geist Mono
  Google-font setup entirely. While rewiring `globals.css`'s `--font-sans`/
  `--font-mono`/`--font-heading` tokens to point at it, also fixed a
  latent bug found in passing: `--font-sans` was defined as
  `var(--font-sans)` — a circular reference — so body text had never
  actually been rendering as Geist Sans, just silently falling back to
  the browser's default sans-serif the whole time. Verified in the
  browser: `getComputedStyle` on both `body` and `h1` resolves to the
  real `jbm` font family (not a fallback), the whole page now reads as
  one consistent monospace typeface, zero console errors beyond the
  expected Turbopack dev-mode HMR websocket noise.

- **2026-09-14 — Mobile/tablet/desktop responsive audit, and a real dark
  mode toggle built from scratch.** Checked the live production site at
  375px, 768px, and 1100-1440px:
  - Found and fixed a real mobile bug: the JetBrains Mono swap made
    "HAKSCAN" + "Log in" + "Start a free scan" too wide for a 375px nav
    — `justify-between` had zero space left, so the logo touched the
    login button with no gap. Fixed with `max-sm:`-scoped padding/size
    overrides on `src/components/marketing/nav.tsx` and a shorter "Scan
    free" label below `sm`; desktop untouched. Pushed and verified live.
  - Tablet (768px) and desktop (1100-1440px, including the auth page's
    `lg:` split-screen layout, never actually checked at true desktop
    width before) both came back clean, zero console errors.
  - **Then asked to check the dark mode toggle — turned out there wasn't
    one.** `layout.tsx`'s inline script reads `localStorage.getItem("theme")`
    and `globals.css` has a complete `.dark` token block, but nothing
    anywhere in the codebase ever called `localStorage.setItem` or
    toggled the class — fully dead, unreachable code, confirmed by
    searching the whole live site for any theme-related control (found
    none). User chose to build a real one rather than leave it dark-only
    or just flag it.
  - Built `src/components/theme-toggle.tsx`: no React state at all — both
    Sun/Moon icons render in the DOM always, `dark:` CSS variants pick
    the visible one, so it can never hydration-mismatch against the
    inline script that already sets the `dark` class before paint. Wired
    into the marketing nav and both dashboard/admin sidebars.
  - **Turning it on for real immediately surfaced a second, deeper bug**:
    the stacked wordmark used in the hero and pricing section
    (`logo-stacked-for-dark-surfaces.svg`) has "hak" baked as near-white
    fill directly in the SVG — completely illegible the moment light
    mode became actually reachable. The brand kit has separate
    light/dark `wordmark-only-*.svg` text assets but no light-surface
    *stacked* lockup, so built `src/components/brand/wordmark.tsx`
    instead: the theme-agnostic icon mark plus a theme-swapped wordmark
    text image (same `dark:` CSS trick as the toggle itself), replacing
    the single baked-dark-only composite everywhere it was used. Deleted
    the now-unused asset. Verified both directions in the browser: light
    mode genuinely applies (computed `--background` flips to near-white,
    confirmed a fresh page load correctly restored dark since that
    session's toggle click had left `localStorage` on "light" —
    the persistence itself works), wordmark legible in both, zero
    console errors either way.
  - Lesson for later: an intermittent screenshot-tool glitch in this
    session (a stale/black frame despite a real successful state change)
    briefly looked like the toggle didn't work at first — resolved by
    checking `getComputedStyle`/`localStorage` directly via
    `javascript_tool` rather than trusting one screenshot, and by forcing
    a full page reload for a clean repaint. Don't conclude a fix failed
    from a single suspicious screenshot alone.

- **2026-09-15 — Admin console checked (desktop clean; mobile viewport
  emulation was unreliable this session — another concurrent session
  appeared to share/contend for the same browser pane's viewport state,
  so a true isolated 375px test couldn't be obtained). Confirmed no
  actual horizontal overflow either way (`scrollWidth` always equalled
  `innerWidth`). One real, pre-existing (not newly introduced) gap:
  `AdminSidebar` is `hidden md:flex`, same as `DashboardSidebar` — no
  mobile nav fallback for the authenticated app. Decision: leave as-is —
  admin is realistically a desktop-only task for the one user who has
  access, and building a mobile nav for it is a bigger scope call than
  the audit warranted. Revisit only if this actually becomes a problem
  in practice.

- **2026-09-15 — Terms of Service: filled in the two real placeholders.**
  Sections 13 (governing law) and 14 (contact) said "to be finalized
  during legal review" / "to be added". Per the user: governing law is
  **India**, contact is **tech@qivalabs.com**. Left the exact
  city/court venue for exclusive jurisdiction as an explicit
  placeholder — the user only confirmed the country, not the specific
  registered-entity city a lawyer would need to name precisely. The
  top "draft, pending legal review" banner is deliberately untouched —
  per `docs/rules.md`'s AI boundary on this file, a fuller draft is not
  the same as an actual lawyer's sign-off, and this session cannot
  provide that sign-off regardless of how complete the draft gets.
  **This was the last item genuinely blocking a real public launch** —
  everything else tracked in this file (OpenAI, Upstash, PayPal live,
  brand kit, responsive/theme audit) is closed. What remains before
  launch is entirely non-technical: getting this draft in front of an
  actual lawyer.
