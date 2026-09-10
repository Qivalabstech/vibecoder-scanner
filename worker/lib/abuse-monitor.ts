import type { createServiceClient } from "./supabase";
import { logAudit } from "./audit";
import { sendAbuseAlertEmail } from "./email";

// Repeated denials are the signal that matters: someone probing for targets
// they can't verify, or hammering the scan-trigger rate limit. A handful of
// denials is normal (a typo'd DNS record, a slow propagation); a burst isn't.
const DENIAL_ACTIONS = ["target.verify.denied", "scan.trigger.denied"];
const THRESHOLD = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Scans recent audit_log entries for per-user denial bursts and alerts on
 * anything new. Meant to be called on an interval from the worker process
 * (see index.ts) — this is the "something reads the audit log" half of
 * Phase 8's abuse-monitoring requirement; logAudit() is the "something
 * writes to it" half, already in place since Phase 2.
 */
export async function runAbuseScan(service: ReturnType<typeof createServiceClient>) {
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();

  const { data: events } = await service
    .from("audit_log")
    .select("user_id, action")
    .in("action", DENIAL_ACTIONS)
    .gte("created_at", windowStart)
    .not("user_id", "is", null);

  const countsByUser = new Map<string, number>();
  for (const e of events ?? []) {
    if (!e.user_id) continue;
    countsByUser.set(e.user_id, (countsByUser.get(e.user_id) ?? 0) + 1);
  }

  for (const [userId, count] of countsByUser) {
    if (count < THRESHOLD) continue;

    // Don't re-alert on the same burst every scan interval.
    const { data: alreadyFlagged } = await service
      .from("audit_log")
      .select("id")
      .eq("user_id", userId)
      .eq("action", "abuse.flagged")
      .gte("created_at", windowStart)
      .maybeSingle();
    if (alreadyFlagged) continue;

    const { data: profile } = await service.from("users").select("email").eq("id", userId).maybeSingle();

    await logAudit({
      userId,
      action: "abuse.flagged",
      metadata: { deniedEventCount: count, windowMinutes: WINDOW_MS / 60000 },
    });

    await sendAbuseAlertEmail({ userId, userEmail: profile?.email ?? null, deniedEventCount: count });
  }
}
