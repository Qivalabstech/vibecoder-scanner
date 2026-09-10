# Requirements

## What this is

A security-scanning platform for "vibecoders" — indie founders who build with
AI (Claude/GPT) and lack deep security background. Users connect a GitHub
repo or a live site, prove they own it, get it scanned by real security
tools, and receive an AI-explained, prioritized report they can actually act
on — not a wall of scanner jargon.

## Users

| Role | Who | Needs |
|---|---|---|
| Vibecoder (free) | Solo founder, 1 project | A quick, honest read on whether their AI-built app has obvious holes, without needing to understand the tools that found them |
| Vibecoder (Pro) | Founder with multiple projects or an app in production | Ongoing coverage: multiple targets, scheduled re-scans, priority queue, reports/alerts they can forward or file |

## Core features

- **Auth**: email/password and GitHub OAuth (Supabase Auth).
- **Ownership-verification gate** (non-negotiable, legally load-bearing):
  no scan runs against a target until ownership is proven — GitHub
  admin/write access for repos, a DNS TXT record or `<meta>` tag challenge
  for sites. Enforced server-side, not just hidden in the UI.
- **Scanning**: Semgrep + Gitleaks for repos, OWASP ZAP baseline (passive
  only) for sites, each run in an isolated, auto-removed Docker container.
- **AI analysis**: raw findings are deduplicated, false-positive-filtered,
  re-triaged for severity, and rewritten in plain language with a concrete
  fix, via the Claude API.
- **Findings dashboard**: per-target scan history, per-scan findings grouped
  by severity, technical detail behind a toggle rather than in the main view.
- **Reports & notifications**: downloadable PDF report per completed scan;
  email on scan completion/failure; optional weekly/monthly re-scans.
- **Billing**: free tier (1 target, manual scans only) vs. paid tier
  (unlimited targets, scheduled scans, priority queue, full reports/alerts),
  via Razorpay subscriptions.
- **Legal/safety guardrails**: per-target authorization attestation, passive-
  only site scanning, per-user scan rate limiting, an audit log of every
  scan/verification event.

## Explicitly out of scope (for now)

- Active exploitation, fuzzing, or any scan mode that could modify or disrupt
  the target — the platform is intentionally passive/baseline-only.
- Scanning targets the user hasn't verified ownership of, under any
  circumstance — this is enforced, not just discouraged.
- A Stripe/other-payment-provider path — Razorpay is the only billing
  integration built.
- Team/org accounts, seats, or shared targets — every target belongs to
  exactly one user.
- A customer-facing subscription-management portal beyond upgrade/cancel —
  no self-serve invoice history, plan switching, etc. yet.

## Success criteria

- A user can sign up, add a target, verify it, and be blocked from scanning
  it until verification succeeds — with no client-side path around that
  block (confirmed: RLS column-level revokes + service-role-only writes to
  `verified`).
- A completed scan produces findings a non-security person can read and act
  on without needing to open "technical details."
- A free-tier user is capped at 1 target and manual scans; a Pro user isn't,
  and can turn on scheduling and get PDF reports + email alerts.
- Upgrading actually flips billing state via Razorpay webhook (not a client
  call the user could spoof), and downgrading/cancelling stops paid
  features from working, including previously-scheduled re-scans.
