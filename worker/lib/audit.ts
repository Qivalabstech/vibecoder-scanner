import { createServiceClient } from "./supabase";

export async function logAudit(entry: {
  userId: string | null;
  targetId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  const service = createServiceClient();
  await service.from("audit_log").insert({
    user_id: entry.userId,
    target_id: entry.targetId ?? null,
    action: entry.action,
    metadata: entry.metadata ?? {},
  });
}
