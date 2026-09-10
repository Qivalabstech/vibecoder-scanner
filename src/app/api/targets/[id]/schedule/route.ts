import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { setScanSchedule } from "@/lib/queue";
import { logAudit } from "@/lib/audit";

const bodySchema = z.object({ frequency: z.enum(["none", "weekly", "monthly"]) });

export async function PATCH(request: Request, ctx: RouteContext<"/api/targets/[id]/schedule">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const { data: target } = await supabase.from("targets").select("*").eq("id", id).single();
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const service = createServiceClient();
  const { data: profile } = await service.from("users").select("plan").eq("id", user.id).single();

  if (parsed.data.frequency !== "none" && profile?.plan !== "paid") {
    return NextResponse.json(
      { error: "plan_required", message: "Scheduled re-scans are a paid-plan feature." },
      { status: 402 }
    );
  }

  const { error } = await supabase
    .from("targets")
    .update({ scan_frequency: parsed.data.frequency })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await setScanSchedule(id, parsed.data.frequency);
  } catch {
    return NextResponse.json(
      { error: "queue_unavailable", message: "Saved, but couldn't reach the scan queue to apply it." },
      { status: 502 }
    );
  }

  await logAudit({
    userId: user.id,
    targetId: id,
    action: "target.schedule.update",
    metadata: { frequency: parsed.data.frequency },
  });

  return NextResponse.json({ frequency: parsed.data.frequency });
}
