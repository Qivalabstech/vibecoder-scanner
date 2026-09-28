import type { createServiceClient } from "./supabase";
import { logAudit } from "./audit";
import { sendOpsAlertEmail } from "./email";

// A single scan failing is normal — a target site being down, a
// transient GitHub API hiccup. A burst across multiple scans/requests
// in a short window is the actual signal something is systemically
// broken (a Docker image stopped building, an API key expired, the
// queue backend is unreachable). Counted system-wide, not per-user —
// unlike abuse-monitor.ts, this isn't about one bad actor.
const FAILURE_ACTIONS = [
  "scan.failed",
  "scan.trigger.insert_failed",
  "scan.trigger.unhandled_error",
  "scan.trigger.queue_unavailable",
];
const THRESHOLD = 3;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * The "something reads the audit log and pages a human" half of
 * checklist item #8 (logging exists via logAudit everywhere; this is
 * the alerting half that was missing). Meant to run on the same
 * interval as runAbuseScan, from the worker process.
 */
export async function runOpsScan(service: ReturnType<typeof createServiceClient>) {
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();

  const { data: events } = await service
    .from("audit_log")
    .select("action")
    .in("action", FAILURE_ACTIONS)
    .gte("created_at", windowStart);

  const count = events?.length ?? 0;
  if (count < THRESHOLD) return;

  // Don't re-alert every interval while the same burst is still inside
  // the window — one email per incident, not one every 15 minutes.
  const { data: alreadyFlagged } = await service
    .from("audit_log")
    .select("id")
    .eq("action", "ops.alert_sent")
    .gte("created_at", windowStart)
    .maybeSingle();
  if (alreadyFlagged) return;

  const breakdown: Record<string, number> = {};
  for (const e of events ?? []) {
    breakdown[e.action] = (breakdown[e.action] ?? 0) + 1;
  }

  await logAudit({
    userId: null,
    action: "ops.alert_sent",
    metadata: { count, windowMinutes: WINDOW_MS / 60000, breakdown },
  });

  await sendOpsAlertEmail({ count, breakdown });
}
