# Phases

Source of truth for status is this file — update checkboxes as work lands,
don't let it drift into a forward-only plan.

## Phase 0 — Design system + UI foundation ✅

- [x] Dark-mode-first tokens, restrained palette, severity color scale
      (`src/app/globals.css`)
- [x] shadcn/ui (Base UI) primitives
- [x] Framer Motion micro-interactions
- [x] 3D interactive hero — cursor-reactive wireframe scan globe
      (`src/components/three/`), lazy-loaded, static fallback for
      `prefers-reduced-motion` / low-end devices / no-WebGL
- [x] Landing page with the same 3D visual in the hero
- [x] **2026-09-12 redesign**: "operator console" identity (phosphor-green
      accent, mono headings, hairline radius) replacing the earlier
      generic-SaaS violet palette — see `design.md` and `memory.md` for
      details. Includes a real scan-in-progress animation
      (`ScanProgressAnimation`) on `/scans/[id]`, replacing a static
      placeholder card.

## Phase 1 — Project scaffold + auth ✅

- [x] Next.js 16 App Router, TypeScript, Tailwind
- [x] Supabase Auth: email/password + GitHub OAuth
- [x] DB schema: `users`, `targets`, `scans`, `findings` + RLS
      (`supabase/migrations/0001_init.sql`)

## Phase 2 — Authorization gate ✅

- [x] GitHub repo verification via OAuth, filtered to admin/write access,
      **re-checked server-side** on every target creation
- [x] Live-site verification: DNS TXT or `<meta>` tag challenge, checked
      server-side (`src/lib/verification.ts`)
- [x] Enforced at the API route level (`src/proxy.ts` +
      `POST /api/targets/[id]/scan`'s explicit check), not just the UI
- [x] Closed a follow-on gap in Phase 7: `verified` wasn't actually
      client-write-protected at the database level until migration `0005`
      — and `0005` itself turned out to be insufficient on hosted Supabase
      (see the 0007 note below); it's the actual fix now.
- [x] **Verified against both a real local and a real hosted Supabase
      instance** (2026-08-28 and 2026-08-30, see `memory.md`): live-site
      verification via a real meta-tag HTTP check, the free-tier limit, and
      the `verified`-column write-protection. The hosted test found the
      protection didn't actually hold there — a raw `INSERT` created a
      fully "verified" target with zero ownership proof, confirmed via the
      live PostgREST API with a real logged-in user's JWT (the exact
      devtools attack this gate exists to prevent). Fixed in migration
      `0007` (see `architecture.md`); re-verified on hosted afterward,
      403/permission-denied as designed, and the legitimate flow (real
      signup → real target creation → real meta-tag verification) still
      works end to end. GitHub repo verification remains unverified — needs
      a real OAuth App.

## Phase 3 — Scan engine (Docker-sandboxed workers) ✅

- [x] `worker/` — standalone Node process, BullMQ + Redis queue
- [x] Repo scan: Semgrep + Gitleaks, each in its own `--rm` container
- [x] Site scan: OWASP ZAP baseline (passive only)
- [x] Isolated per-tool containers, `--network none` except where a tool
      genuinely needs egress (Semgrep's rule registry)
- [x] Raw findings → `findings.raw_tool_output`
- [x] **Site scan (ZAP) verified with a real run** (2026-09-01, see
      `memory.md`): trigger → BullMQ → worker → real `docker run
      zaproxy/zap-stable` → 9 real findings written and rendered correctly,
      `scans.status` reaching `done`. Found and fixed a real bug in the
      process (ZAP's `desc`/`solution` HTML markup leaking into the raw
      finding text). Repo scan (Semgrep/Gitleaks) remains unverified — needs
      a real GitHub OAuth App and a repo.

## Phase 4 — AI analysis layer (Claude API) ✅

- [x] Batch findings to `claude-opus-5` via `messages.parse()` + Zod
      structured output (`worker/lib/claude-analysis.ts`)
- [x] Deduplicate, filter false positives, re-assess severity, write
      plain-language explanation + fix suggestion
- [x] Graceful degradation if `ANTHROPIC_API_KEY` is unset or the call fails
      — **confirmed under a real failure condition** (2026-09-01): no key
      configured, `scan.ai_analysis_skipped` logged, scan still completed
      with usable raw findings and a working PDF report.

## Phase 5 — Dashboard UI ✅

- [x] Target list/detail page with verification status
- [x] Scan results grouped by severity, expandable cards, raw output behind
      a "technical details" toggle
- [x] Scan history per target with a per-severity count strip

## Phase 6 — Reports + notifications ✅

- [x] PDF report generation (`@react-pdf/renderer`) — executive summary +
      full findings appendix — **verified with a real completed scan**
      (2026-09-01): `GET /api/scans/[id]/report` returned a real, valid
      `application/pdf` blob.
- [x] Email on scan complete/failed (Resend), best-effort — still
      unverified (no `RESEND_API_KEY` in this environment; the graceful-
      skip path was exercised by omission, not the send path itself)
- [x] Scheduled re-scans (weekly/monthly), gated to paid plans

## Phase 7 — Billing (Razorpay) ✅

- [x] Free tier: 1 target, manual scan only (enforced server-side in
      `POST /api/targets`)
- [x] Paid tier: unlimited targets, scheduled scans, full PDF
      reports/email alerts — the scheduling and target-limit gates already
      existed from Phases 5–6; Phase 7 wired the actual plan flip
- [x] Razorpay subscription creation + Checkout.js integration
      (`UpgradeButton`)
- [x] Webhook handling (`activated`/`charged` → paid, `cancelled`/
      `completed`/`halted`/`expired` → free), HMAC-verified
- [x] Cancel flow (`cancel_at_cycle_end`, doesn't yank access mid-period)
- [x] Priority scan queue: paid-user jobs are enqueued unprioritized
      (BullMQ's fast lane — unprioritized jobs run before any explicitly
      prioritized one), free-user jobs get an explicit low priority
      (`src/lib/queue.ts` → `enqueueScan`'s `isPaid` option, threaded
      through from the trigger route's plan lookup)

## Phase 8 — Legal + safety guardrails 🟡 mostly done

- [x] Scan-authorization attestation checkbox at target-add time
      (`authorization_attested`, required by both repo and site add flows)
- [x] ZAP baseline/passive mode only — no active exploitation
- [x] Per-user scan rate limiting (5 triggers/hour, `src/lib/rate-limit.ts`)
- [x] Audit log of every verification attempt and scan trigger
      (`audit_log` table, `logAudit()`)
- [x] Abuse monitoring on top of the audit log: `worker/lib/abuse-monitor.ts`
      runs every 15 minutes (interval in `worker/index.ts`), flags any user
      with 5+ `target.verify.denied`/`scan.trigger.denied` events in the
      last hour, writes an `abuse.flagged` audit_log row (deduped per
      window), and emails `ADMIN_EMAIL` if configured
- [x] Terms of Service expanded to a full draft (`src/app/legal/terms/page.tsx`)
      covering acceptance, service description, account eligibility, scan
      authorization, scope of scanning, prohibited uses, third-party
      services (Supabase/Anthropic/GitHub/Resend/Razorpay), billing,
      data retention, warranty disclaimer, liability limitation,
      termination, governing law, and contact
- [ ] **Not actually done, and can't be by an AI**: sign-off from qualified
      legal counsel. The ToS page carries a visible "draft, pending legal
      review" banner rather than presenting as final — do not remove that
      banner without an actual lawyer's review. Governing law and contact
      details are explicit placeholders in the copy itself.

## Not started

- A customer-facing billing portal beyond upgrade/cancel (invoice history,
  payment-method update, etc.)
- Team/org accounts
- CI/CD, staging environment, production deploy configuration
