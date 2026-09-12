import { Resend } from "resend";
import type { Severity } from "./findings";

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function renderCounts(counts: Record<Severity, number>) {
  const parts = (["critical", "high", "medium", "low"] as const)
    .filter((sev) => counts[sev] > 0)
    .map((sev) => `${counts[sev]} ${sev}`);
  return parts.length ? parts.join(", ") : "no issues";
}

/**
 * Best-effort — a scan finishing is the important event, and email is a
 * notification about it, not a dependency of it. Skips quietly (with an
 * audit-log breadcrumb from the caller) if RESEND_API_KEY isn't set.
 */
export async function sendScanCompleteEmail(opts: {
  to: string;
  targetIdentifier: string;
  scanId: string;
  status: "done" | "failed";
  counts: Record<Severity, number>;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const reportUrl = `${appUrl()}/scans/${opts.scanId}`;

  const subject =
    opts.status === "failed"
      ? `Scan failed: ${opts.targetIdentifier}`
      : `Scan complete: ${opts.targetIdentifier} — ${renderCounts(opts.counts)}`;

  const body =
    opts.status === "failed"
      ? `<p>Your scan of <strong>${opts.targetIdentifier}</strong> failed before producing results.</p>
         <p><a href="${reportUrl}">View details</a></p>`
      : `<p>Your scan of <strong>${opts.targetIdentifier}</strong> is done: ${renderCounts(opts.counts)}.</p>
         <p><a href="${reportUrl}">View the full report</a></p>`;

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "Hakscan <onboarding@resend.dev>",
    to: opts.to,
    subject,
    html: body,
  });
}

/**
 * Alerts a human when the abuse monitor flags a denial burst. Needs both
 * RESEND_API_KEY and ADMIN_EMAIL — silently skips (the caller already wrote
 * the abuse.flagged audit_log row regardless, so nothing is lost, just
 * unseen until someone reads the log directly).
 */
export async function sendAbuseAlertEmail(opts: {
  userId: string;
  userEmail: string | null;
  deniedEventCount: number;
}) {
  if (!process.env.RESEND_API_KEY || !process.env.ADMIN_EMAIL) return;

  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "Hakscan <onboarding@resend.dev>",
    to: process.env.ADMIN_EMAIL,
    subject: `Abuse flag: ${opts.deniedEventCount} denied attempts in an hour`,
    html: `<p>User <strong>${opts.userEmail ?? opts.userId}</strong> (id: ${opts.userId}) triggered
           ${opts.deniedEventCount} target-verification or scan-trigger denials in the last hour.</p>
           <p>This could be a user probing for targets they don't own, or repeatedly hitting the
           rate limit. Check <code>audit_log</code> for this user_id to see the specific events.</p>`,
  });
}
