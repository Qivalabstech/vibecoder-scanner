# Memory

**This file is a running log — update it whenever meaningful progress
happens** (a phase lands, a bug is found and fixed, a blocker shows up), not
just at setup. A memory.md only ever written once is worth nothing to the
next session.

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
