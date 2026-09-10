import { createServiceClient } from "@/lib/supabase/service";

const SCAN_TRIGGERS_PER_HOUR = 5;

/**
 * Blunt per-user throttle so the scanner can't be turned into a free port
 * scanner / DoS proxy against arbitrary verified targets (Phase 8 requirement).
 * Counts recent scans across all of the user's targets, not just this one.
 */
export async function isOverScanRateLimit(userId: string): Promise<boolean> {
  const service = createServiceClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: targets } = await service.from("targets").select("id").eq("user_id", userId);
  const targetIds = (targets ?? []).map((t) => t.id);
  if (targetIds.length === 0) return false;

  const { count } = await service
    .from("scans")
    .select("*", { count: "exact", head: true })
    .in("target_id", targetIds)
    .gte("created_at", oneHourAgo);

  return (count ?? 0) >= SCAN_TRIGGERS_PER_HOUR;
}
