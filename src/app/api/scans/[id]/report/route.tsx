import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { ScanReportDocument, type ReportFinding } from "@/lib/pdf-report";

export async function GET(_request: Request, ctx: RouteContext<"/api/scans/[id]/report">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: scan } = await supabase
    .from("scans")
    .select("*, targets(identifier, type)")
    .eq("id", id)
    .single();

  if (!scan) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (scan.status !== "done") {
    return NextResponse.json({ error: "scan_not_complete", message: "Scan hasn't finished yet." }, { status: 409 });
  }

  const { data: findings } = await supabase
    .from("findings")
    .select("id, severity, title, description, file_path, line_number, ai_explanation, ai_fix_suggestion")
    .eq("scan_id", scan.id);

  const target = scan.targets;
  const buffer = await renderToBuffer(
    <ScanReportDocument
      data={{
        targetIdentifier: target?.identifier ?? "unknown target",
        targetType: target?.type ?? "site",
        scanId: scan.id,
        scanDate: new Date(scan.completed_at ?? scan.created_at).toLocaleString(),
      }}
      findings={(findings as ReportFinding[] | null) ?? []}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="hakscan-${scan.id.slice(0, 8)}.pdf"`,
    },
  });
}
