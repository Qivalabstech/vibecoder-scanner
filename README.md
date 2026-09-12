# Hakscan

_(formerly "Vibecoder Scanner" — renamed 2026-09-12; see `docs/memory.md`.)_

Security scanning platform for indie founders building with AI. **Phases
0–8 are all built**: design system, auth, the ownership verification gate,
the Docker-sandboxed scan workers, the Claude AI-analysis layer, the
findings dashboard, reports/notifications, PayPal billing, and legal +
safety guardrails. The one thing that genuinely can't be finished by an AI
session is real legal sign-off on the Terms of Service — see `docs/phases.md`
and the note at the bottom of this file.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui (Base UI) ·
Supabase (Postgres + Auth) · Framer Motion · React Three Fiber · BullMQ +
Redis (queue) · Docker (Semgrep / Gitleaks / OWASP ZAP baseline) · Claude API
(`@anthropic-ai/sdk`, findings triage) · `@react-pdf/renderer` (reports) ·
Resend (scan-complete emails) · PayPal (subscriptions)

> This Next.js version has real breaking changes vs. older docs/training data
> — `middleware.ts` is now `src/proxy.ts`, route params are async, etc. See
> `node_modules/next/dist/docs/` before changing routing/auth code.

## Setup

**Whichever option you pick, apply every file in `supabase/migrations/` in
order, especially `0007_lock_down_all_client_writes.sql`.** It's not
optional hardening — without it, on a fresh Supabase project (confirmed on
real hosted infrastructure, not a hypothetical), a logged-in user can
`INSERT` a target with `verified: true` directly via the REST API,
completely bypassing the ownership-verification gate, and `PATCH`
`users.plan` to `'paid'` directly, completely bypassing billing. See
`docs/architecture.md` → Key decisions and `docs/memory.md`'s 2026-08-30
entry for exactly how this was found (by attacking a real project) and
why RLS policies + a naive `GRANT` don't prevent it on their own.

### Option A — local Supabase

This repo is already `supabase init`'d (`supabase/config.toml`). If you have
Docker and the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase start
```

This pulls ~12 images (Postgres, Auth, Studio, Kong, Realtime, etc. — a few
GB, only on first run) and applies every migration in
`supabase/migrations/` automatically. It prints a `NEXT_PUBLIC_SUPABASE_URL`
(`http://127.0.0.1:54321`), `ANON_KEY`, and `SERVICE_ROLE_KEY` — put those in
`.env.local` (see below). Auth emails land in a local inbox at
`http://127.0.0.1:54324` (Mailpit) instead of actually sending — useful for
grabbing confirmation links without a real email provider.

If you hit `permission denied for table <name>` on any table your own code
is supposed to be able to write, a migration didn't apply; run `supabase
migration up` or `supabase db reset`. (If a client write you *didn't*
expect to work also gets `permission denied` — that's `0007` doing its job,
not a bug.)

**Disk note**: Docker Desktop's virtual disk does not shrink back after
`docker system prune` — if you're tight on host disk, budget accordingly
before pulling the scanner images (Semgrep/ZAP are the large ones, 1GB+
each) on top of the Supabase stack. Local Docker Supabase was used for the
2026-08-28 test round; the project since switched primary testing to a
real hosted Supabase project (2026-08-30) partly because of disk pressure
here — see `docs/memory.md` for both.

### Option B — hosted Supabase

This is what the project is currently configured against (see
`docs/memory.md`'s 2026-08-30 entry) — `.env.local` points at a real
supabase.com project.

1. Create a Supabase project, then run the migrations in `supabase/migrations/`
   against it — easiest via direct `psql` against the connection string from
   Project Settings → Database (`postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres`,
   URL-encode any special characters in the password), one file at a time
   in order; or the SQL editor; or `supabase db push` if you're using the CLI.
2. Create a GitHub OAuth App (Settings → Developer settings) with callback URL
   `<your-app-url>/auth/callback`, and add it as a GitHub provider in
   Supabase Auth settings (Authentication → Providers → GitHub), using the
   same client ID/secret.
3. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings → API
   - `SUPABASE_SERVICE_ROLE_KEY` — same page (server-only, never expose to the client)
   - `ANTHROPIC_API_KEY` — needed by the worker's AI-analysis pass; if unset,
     scans still complete with raw (unanalyzed) findings — see below
   - `RESEND_API_KEY` / `RESEND_FROM_EMAIL` — needed for scan-complete
     emails; if unset, scans still complete, just silently without an email
   - `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_WEBHOOK_ID` /
     `NEXT_PUBLIC_PAYPAL_CLIENT_ID` — from your PayPal developer app
   - `PAYPAL_PLAN_ID` — a Product + Plan you create yourself in the PayPal
     developer dashboard (Products & Plans); this app doesn't create one
     for you
   - `PAYPAL_ENV` — `sandbox` while testing, unset (or `live`) in production
   - `ADMIN_EMAIL` — where abuse-monitor alerts go; if unset, flagged users
     still get written to `audit_log`, nobody just gets paged about it
### Then, either way

4. `npm install && npm run dev`
5. To actually run scans, you need Docker and Redis (auth/dashboard/billing
   work without them — only scan execution needs this):
   - `docker compose up -d` starts Redis on `localhost:6379`
   - `npm run worker:dev` starts the BullMQ worker, which shells out to
     `docker run` for each scan tool — Docker itself must be running
     (Docker Desktop, Colima, etc.), separate from the `docker compose` Redis
     container
   - Triggering a scan (dashboard "Scan" button, or `POST
     /api/targets/:id/scan`) enqueues a job; the worker picks it up, updates
     `scans.status`, and writes rows to `findings`

## What's implemented

- **Design system**: dark-mode-first tokens, restrained palette + severity
  colors, shadcn/ui primitives, Framer Motion micro-interactions, a
  cursor-reactive 3D scan globe (React Three Fiber) with a static-gradient
  fallback for `prefers-reduced-motion` / low-end devices / no-WebGL.
- **Auth**: Supabase email+password and GitHub OAuth (`repo` scope requested
  up front so the verification gate can list admin/write repos later).
- **Authorization gate** (the legally load-bearing part):
  - Repo targets: re-verified server-side against the live GitHub API on
    every `POST /api/targets` — the UI only shows repos you administer, but
    the server never trusts that alone.
  - Site targets: DNS TXT (`_hakscan-challenge.<host>`) or `<meta>` tag
    challenge, checked server-side in `src/lib/verification.ts`.
  - `src/proxy.ts` blocks unauthenticated requests to `/api/targets*` before
    they reach a route handler at all; `POST /api/targets/[id]/scan` then
    separately checks `target.verified` and rejects with 403 if false — so no
    scan can be triggered even by a client that bypasses the UI.
  - Every verification/scan-trigger attempt is written to `audit_log` via the
    service-role client (`src/lib/audit.ts`).
  - `POST /api/targets/[id]/scan` also throttles to 5 scan triggers/hour per
    user (`src/lib/rate-limit.ts`) so the platform can't be used as a free
    scanning proxy against arbitrary verified targets.
- **Scan workers** (`worker/`): a standalone Node process (not part of the
  Next.js app — run separately with `npm run worker:dev`) consuming a BullMQ
  queue. Each job re-checks `target.verified` before doing anything, then:
  - **repo**: shallow-clones with the stored GitHub token into a temp dir,
    runs Semgrep and Gitleaks each in their own `--rm --network none` Docker
    container (Semgrep's `--config auto` is the one deliberate exception —
    it needs egress to pull rules from Semgrep's registry), maps results to
    `findings`, then deletes the temp dir.
  - **site**: runs ZAP's baseline scan (passive-only, per Phase 8 — no active
    exploitation) against the verified URL in its own container.
  - If Redis is unreachable when a scan is triggered, the API route marks
    the scan `failed` immediately rather than leaving it stuck `queued`
    forever with nothing watching it.
- **AI analysis layer** (`worker/lib/claude-analysis.ts`): after raw findings
  are inserted, the worker sends them to Claude (`claude-opus-5`) in batches
  of 40 via `client.messages.parse()` with a Zod output schema (structured
  outputs, not a hand-parsed tool call) and asks it to:
  - flag duplicates and confident false positives — those rows are deleted
    rather than shown to the user;
  - re-assess severity with CVSS-style reasoning, overwriting the raw tool's
    provisional severity;
  - write `ai_explanation` (plain-language business impact) and
    `ai_fix_suggestion` (a concrete code-level fix) onto the remaining rows.
  - If `ANTHROPIC_API_KEY` is unset or the call fails, the scan still
    completes with the raw, unanalyzed findings intact — an unanalyzed
    result beats a scan that never finishes — and an
    `scan.ai_analysis_skipped` row lands in `audit_log`.
- **Findings dashboard**:
  - `/targets/[id]` — target detail with a "Scan now" button and scan
    history (status badge, timestamp, a per-severity count strip per past
    scan), each row linking to its results.
  - `/scans/[id]` — findings grouped by severity (critical → low), each an
    expandable card. Collapsed shows severity + title + file location;
    expanded shows the AI's plain-language explanation and fix suggestion
    (or the raw scanner description if AI analysis was skipped) up front,
    with raw tool output/file/line behind a separate "Show technical
    details" toggle — the raw JSON never appears in the main view.
  - While a scan is `queued`/`running`, `ScanPoller` re-fetches the page
    every 4s — a deliberately dumb stand-in for push notifications.
- **Reports + notifications**:
  - `GET /api/scans/[id]/report` streams a PDF (`src/lib/pdf-report.tsx`,
    `@react-pdf/renderer`) — executive summary (per-severity counts) plus a
    full findings appendix — from a completed scan; a "PDF report" button
    appears on `/scans/[id]` once `status === "done"`.
  - The worker emails the target owner when a scan finishes or fails
    (`worker/lib/email.ts`, Resend) with the severity breakdown and a link
    to the results. Best-effort: a missing `RESEND_API_KEY` or a Resend
    outage is logged to `audit_log` as `scan.notification_failed` and
    swallowed — it never fails the scan itself.
  - Scheduled re-scans (weekly/monthly), gated to paid plans: the
    `ScheduleSelector` on `/targets/[id]` calls `PATCH
    /api/targets/[id]/schedule`, which 402s for free-plan users and
    otherwise registers a BullMQ job scheduler (cron-based repeatable job,
    `src/lib/queue.ts` → `setScanSchedule`) that fires without a
    pre-existing `scans` row — the worker creates one itself, re-checking
    both `target.verified` and the user's plan (self-cancelling the
    scheduler if it's lapsed) before running.
- **Billing (PayPal)**:
  - `UpgradeButton` (`/settings/billing`) calls `POST /api/billing/subscribe`,
    which creates a PayPal subscription server-side and returns just
    enough (`subscriptionId`, `clientId`) for the client to render PayPal's
    own JS SDK Buttons component and approve it — there's no custom-modal
    equivalent to a Checkout.js-style flow for PayPal subscriptions.
  - `POST /api/billing/webhook` is the actual source of truth for plan
    state, not the client callback: signature-verified by round-tripping
    the transmission headers + raw body to PayPal's own
    `/v1/notifications/verify-webhook-signature` endpoint (see
    `src/lib/paypal.ts`), `BILLING.SUBSCRIPTION.ACTIVATED`/
    `PAYMENT.SALE.COMPLETED` → `plan: "paid"`, `.CANCELLED`/`.EXPIRED`/
    `.SUSPENDED` → `plan: "free"`.
  - `POST /api/billing/cancel` cancels **immediately** — PayPal has no
    "cancel at cycle end," so unlike the earlier Razorpay integration, a
    cancelled user drops to `free` right away rather than at the end of
    the billing period.
  - **Nothing is client-writable at the database level except one narrow
    column** (`targets.scan_frequency`) — see
    `supabase/migrations/0007_lock_down_all_client_writes.sql` and
    `docs/architecture.md` → Key decisions. This closes a real gap found
    twice: first locally (missing table grants entirely), then — after the
    first fix turned out not to transfer — on a real hosted Supabase
    project, where a logged-in user could `INSERT` a pre-verified target
    or `PATCH` their own plan to `'paid'` directly via the REST API,
    completely bypassing the ownership gate and billing. Confirmed fixed
    with the same live attacks afterward (403, as designed).
  - Priority scan queue: a paid user's scan job is enqueued unprioritized
    (BullMQ's fast lane — jobs with no explicit priority run before any
    explicitly-prioritized job), a free user's job gets an explicit low
    priority (`src/lib/queue.ts` → `enqueueScan`'s `isPaid` flag, set from
    the trigger route's plan lookup) — so paid scans jump ahead of free ones
    in the same queue.
- **Legal + safety guardrails (Phase 8)**:
  - Per-target authorization attestation, per-user scan rate limiting
    (5/hour), and an audit log of every verification/scan/billing/schedule
    event were already in place from earlier phases (see `src/lib/audit.ts`
    and its callers throughout).
  - `worker/lib/abuse-monitor.ts` closes the "write-only audit log" gap: an
    interval in `worker/index.ts` runs it every 15 minutes, flags any user
    with 5+ denied verification/scan attempts in the last hour, writes an
    `abuse.flagged` row (deduped so it doesn't re-alert every interval), and
    emails `ADMIN_EMAIL` if configured.
  - `src/app/legal/terms/page.tsx` is now a full draft (acceptance, service
    description, scan authorization, scope, prohibited uses, third-party
    processors, billing, data retention, warranty/liability, termination,
    governing law, contact) with a visible "draft, pending legal review"
    banner — **an AI session cannot provide the actual legal sign-off this
    still needs before real users or payments**; that banner should stay
    until a qualified lawyer reviews it.

## What's not built yet

Nothing from the original 8-phase spec. What remains is entirely outside an
AI session's ability to complete: real legal counsel reviewing and signing
off on the Terms of Service (`src/app/legal/terms/page.tsx` carries a
visible "draft" banner for exactly this reason). Everything else has now
been tested against both a real local Supabase instance and a real hosted
Supabase project — auth, the authorization gate, database write privileges
(twice — see `docs/memory.md`'s 2026-08-28 and 2026-08-30 entries, the
second one found and fixed a real bypass the first round had missed), the
free-tier limit, and — as of 2026-09-01 — a complete real scan: trigger →
queue → worker → an actual `docker run zaproxy/zap-stable` → real findings
written and rendered → a real generated PDF report, with AI analysis
correctly degrading (no key configured) rather than blocking the scan.
Still unverified: the repo-scan path (Semgrep/Gitleaks + GitHub OAuth —
needs a real GitHub OAuth App and a repo to scan), and the Claude/Resend/
PayPal integrations (no real API keys available during testing).
