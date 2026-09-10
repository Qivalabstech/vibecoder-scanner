# Architecture

## Stack

- Next.js 16 (App Router, Turbopack) + TypeScript
- Tailwind v4 + shadcn/ui (Base UI primitives, not Radix)
- Supabase: Postgres + Auth + RLS (client/server/service-role clients)
- Framer Motion (micro-interactions) + React Three Fiber (3D hero)
- BullMQ + Redis (scan job queue, including cron-based scheduled re-scans)
- Docker, shelled out to from the worker: `semgrep/semgrep`,
  `zricethezav/gitleaks`, `zaproxy/zap-stable`
- `@anthropic-ai/sdk` (`claude-opus-5`, structured outputs via
  `messages.parse()` + Zod) for findings triage
- `@react-pdf/renderer` (PDF reports), Resend (email)
- `razorpay` (Node SDK) for subscriptions + webhook signature verification

## Two runtimes, one database

```
┌─────────────────────────┐        ┌───────────────────────────┐
│  Next.js app (src/)      │        │  worker/ — standalone Node │
│  - pages, API routes      │  BullMQ │  process, run separately   │
│  - proxy.ts auth gate    │───────▶│  (npm run worker:dev)      │
│  - enqueues scan jobs    │  queue  │  - polls Docker tools      │
└───────────┬──────────────┘        │  - calls Claude, Resend    │
            │                        └──────────────┬─────────────┘
            │ Supabase (RLS-scoped            service-role
            │ client/server clients)                │
            ▼                                        ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase Postgres                        │
│  users · targets · scans · findings · audit_log ·             │
│  github_connections                                            │
└─────────────────────────────────────────────────────────────┘
```

`worker/` intentionally does not import from `src/` (its own
`worker/lib/supabase.ts`, `worker/lib/audit.ts` duplicate the thin service-
client wrappers) — it's meant to run and deploy independently of the Next
app, e.g. on a different host/container.

## Request flow: adding and scanning a target

```
add target (repo)          add target (site)
  │                            │
  ▼                            ▼
POST /api/targets          POST /api/targets
  re-checks GitHub API       generates verification_token
  admin/push access             │
  (never trusts the UI)         ▼
  │                        user adds DNS TXT / <meta> tag
  ▼                            │
verified=true immediately      ▼
                           POST /api/targets/[id]/verify
                             checks DNS/meta server-side
                             (service-role client writes
                             `verified`)
  │                            │
  └──────────┬─────────────────┘
             ▼
      POST /api/targets/[id]/scan
        403s if !target.verified
        429s if rate-limited (5/hr/user)
        enqueues a BullMQ job
             ▼
      worker/index.ts processScan()
        re-checks target.verified (belt-and-suspenders)
        runs Semgrep+Gitleaks or ZAP in Docker
        inserts raw findings
        sends them to Claude → severity/explanation/fix,
          deletes duplicates/false-positives
        emails the user (best-effort)
             ▼
      /scans/[id] — dashboard reads findings via RLS
      GET /api/scans/[id]/report — PDF, only once status=="done"
```

## Full file layout

```
src/
  app/
    (auth)/{login,signup}/page.tsx
    (dashboard)/
      layout.tsx                    — auth-gates the whole group, renders sidebar
      dashboard/page.tsx            — overview
      targets/{page.tsx,new/page.tsx,[id]/page.tsx}
      scans/[id]/page.tsx
      settings/billing/page.tsx
    api/
      targets/{route.ts,[id]/{scan,verify,schedule}/route.ts}
      github/repos/route.ts
      scans/[id]/report/route.tsx   — PDF stream
      billing/{subscribe,cancel,webhook}/route.ts
    auth/callback/route.ts          — OAuth code exchange
    legal/terms/page.tsx
    page.tsx                        — marketing landing page
    globals.css                     — design tokens (see design.md)
  components/
    auth/       — login/signup forms, GitHub OAuth button, split-screen shell
    dashboard/  — target/finding/scan cards, scan trigger, schedule selector,
                  billing buttons, sidebar
    marketing/  — landing page sections
    three/      — 3D scan-globe hero (lazy-loaded, reduced-motion fallback)
    ui/         — shadcn/ui primitives
    icons/      — hand-rolled GitHub mark (lucide dropped brand icons)
  lib/
    supabase/{client,server,service}.ts — three trust levels, see rules.md
    queue.ts        — BullMQ producer + job-scheduler (Next-app side)
    github.ts       — list/verify admin-or-push repos via GitHub API
    verification.ts — DNS TXT / meta-tag challenge generation + checks
    audit.ts        — audit_log writer
    rate-limit.ts   — 5 scans/hour/user
    razorpay.ts     — Razorpay client + subscription constants
    severity.ts     — shared severity ordering/labels/colors
    pdf-report.tsx  — @react-pdf/renderer document
  proxy.ts          — Next 16's middleware.ts replacement; auth gate + session refresh
worker/
  index.ts                — BullMQ Worker, orchestrates one scan end-to-end
  lib/{supabase,audit,findings,claude-analysis,email,docker-run}.ts
  scanners/{repo-scan,site-scan}.ts
supabase/migrations/
  0001_init.sql                    — users/targets/scans/findings/audit_log + RLS
  0002_github_connections.sql      — stored OAuth token for repo listing
  0003_scheduled_scans.sql         — targets.scan_frequency
  0004_billing.sql                 — users.razorpay_*, plan_renews_at
  0005_lock_down_client_writes.sql — column-level REVOKE (see rules.md)
docker-compose.yml   — local Redis only; Docker itself must be installed separately
```

## Key decisions (and why)

- **Ownership verification is enforced twice, server-side both times.**
  `src/proxy.ts` blocks unauthenticated requests to target/scan API routes
  before they reach a handler; the handler itself re-checks
  `target.verified`. The client UI is not a trust boundary anywhere in this
  path.
- **The RLS-scoped (`authenticated`) client can write almost nothing.** RLS
  "own row" policies only check row ownership, not which columns are
  touched, or even which *operations* are safe to allow — the only INSERT/
  UPDATE/DELETE `authenticated` has anywhere in this schema, as of migration
  `0007`, is `UPDATE (scan_frequency)` on `targets` (a user preference, not
  a security boundary). Target creation (`verified`, `authorization_attested`
  at insert time), the `verified` flag, scan creation and status, findings,
  `audit_log`, `github_connections`, and `users.plan`/`razorpay_*` are all
  written exclusively through the service-role client from server-validated
  route code. See `memory.md`'s 2026-08-28/30 entries for how this was
  found — the short version: it wasn't found by review, it was found by
  actually attacking a real hosted Supabase project with the same JWT a
  browser client would have, and it worked, twice (a pre-verified target
  via raw `INSERT`, and a free billing upgrade via raw `PATCH`) before this
  became the design.
- **Repo access is re-verified against the live GitHub API on every target
  creation**, not trusted from what the picker UI displayed — a client could
  otherwise submit an arbitrary `owner/repo` string.
- **Scheduled scans don't pre-create a `scans` row.** A BullMQ job scheduler
  fires with just `{targetId}`; the worker creates the row itself after
  re-checking both verification and (since scheduling is paid-only) that the
  plan hasn't lapsed since the schedule was set — self-cancelling the
  scheduler if so.
- **AI analysis failure degrades, never blocks.** Missing `ANTHROPIC_API_KEY`
  or a failed Claude call leaves raw (unanalyzed) findings in place rather
  than failing the scan — same pattern for missing `RESEND_API_KEY`. An
  unreachable Redis at scan-trigger time is the one case that does fail
  loudly (scan marked `failed` immediately, not left `queued` forever).
- **Razorpay subscriptions require a finite `total_count`**; there's no
  native "until cancelled." `SUBSCRIPTION_TOTAL_COUNT = 120` (10 years) is
  the stand-in — cancellation is a separate explicit action either way.
- **RLS policies are necessary but not sufficient — every table also needs
  explicit, table-level-REVOKE-first `GRANT`s.** Postgres checks table-level
  privilege *before* RLS ever runs, and — this is the part that took two
  rounds to get right — **a column-level `REVOKE` does not override a
  coexisting table-level `GRANT`.** If a role has table-level `UPDATE`, it
  can update every column regardless of any column-specific `REVOKE`
  layered on top; the only reliable way to restrict a role to specific
  columns is to `REVOKE` the table-level privilege outright, then `GRANT`
  back only the exact columns needed. This wasn't obvious from documentation
  or reasoning — it took two separate rounds of "found via a real attack
  against real Supabase infrastructure" to converge on it, on two different
  Supabase environments with two different default states:
  - **Local** (`supabase start`, Docker): tables created by the `postgres`
    role inherit *`postgres`'s own* restrictive default ACL for schema
    `public` (`TRUNCATE`/`REFERENCES`/`TRIGGER` only) — the opposite problem,
    migration `0006` fixed this with explicit per-table grants.
  - **Hosted** (a real supabase.com project): `authenticated` had broad
    table-level `INSERT`/`UPDATE`/`DELETE` on *every* table by default,
    independent of anything this project's migrations granted. `0006`'s
    column-scoped approach — written and empirically verified against
    *local* — turned out to do nothing on hosted, because the pre-existing
    table-level grant already covered every column regardless. Confirmed by
    directly attacking the live hosted PostgREST API with a real logged-in
    user's JWT: a raw `INSERT` created a target with `verified: true` (a
    complete ownership-gate bypass), and a raw `PATCH` set `users.plan` to
    `'paid'` (a complete billing bypass) — both succeeded, both `200`/`201`,
    no error. The same check across every other table (`scans`, `findings`,
    `audit_log`, `github_connections`) showed the identical pattern:
    unrestricted `INSERT`/`UPDATE`/`DELETE` for `authenticated` by default.
  - **The actual fix, migration `0007`**: `REVOKE INSERT, UPDATE, DELETE`
    outright from `authenticated` on every table, then `GRANT` back exactly
    one thing — `UPDATE (scan_frequency)` on `targets`. Everything else a
    user can legitimately trigger (creating a target, verifying it,
    triggering a scan, upgrading a plan) now goes through the service-role
    client from server-validated route code
    (`src/app/api/targets/route.ts`, `src/app/api/targets/[id]/scan/route.ts`
    were updated accordingly), never the RLS-scoped one. Re-verified with
    the same live attacks afterward: both now return `403 permission denied`.
  - **Takeaway for any new table**: never assume a fresh environment's
    default privileges, in either direction. `REVOKE` explicitly before you
    `GRANT` explicitly, scope `authenticated` to the absolute minimum
    (ideally just `SELECT`), and do every write that has a business rule
    attached to it through the service-role client after the route has
    already validated that rule server-side.
