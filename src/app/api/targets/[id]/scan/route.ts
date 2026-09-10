import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logAudit } from "@/lib/audit";
import { enqueueScan } from "@/lib/queue";
import { isOverScanRateLimit } from "@/lib/rate-limit";

export async function POST(_request: Request, ctx: RouteContext<"/api/targets/[id]/scan">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: target } = await supabase.from("targets").select("*").eq("id", id).single();
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (!target.verified) {
    await logAudit({
      userId: user.id,
      targetId: target.id,
      action: "scan.trigger.denied",
      metadata: { reason: "target_not_verified" },
    });
    return NextResponse.json(
      { error: "target_not_verified", message: "Verify ownership of this target before scanning." },
      { status: 403 }
    );
  }

  if (await isOverScanRateLimit(user.id)) {
    await logAudit({
      userId: user.id,
      targetId: target.id,
      action: "scan.trigger.denied",
      metadata: { reason: "rate_limited" },
    });
    return NextResponse.json(
      { error: "rate_limited", message: "Too many scans triggered in the last hour. Try again later." },
      { status: 429 }
    );
  }

  // Service-role client: as of migration 0007, `authenticated` has no
  // INSERT privilege on `scans` at all — scan rows are always
  // server-created, after the verification/rate-limit checks above.
  const service = createServiceClient();
  const { data: scan, error } = await service
    .from("scans")
    .insert({ target_id: target.id, status: "queued" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: profile } = await supabase.from("users").select("plan").eq("id", user.id).single();

  try {
    await enqueueScan({ scanId: scan.id, targetId: target.id }, { isPaid: profile?.plan === "paid" });
  } catch {
    // No worker/queue reachable — don't leave a scan stuck in "queued" forever.
    await service.from("scans").update({ status: "failed" }).eq("id", scan.id);
    await logAudit({
      userId: user.id,
      targetId: target.id,
      action: "scan.trigger.queue_unavailable",
      metadata: { scanId: scan.id },
    });
    return NextResponse.json(
      { error: "queue_unavailable", message: "Scan queue is unreachable. Try again shortly." },
      { status: 502 }
    );
  }

  await logAudit({
    userId: user.id,
    targetId: target.id,
    action: "scan.trigger",
    metadata: { scanId: scan.id },
  });

  return NextResponse.json({ scan }, { status: 201 });
}
