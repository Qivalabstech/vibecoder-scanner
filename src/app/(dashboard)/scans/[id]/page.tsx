import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScanStatusBadge, type ScanStatus } from "@/components/dashboard/scan-status-badge";
import { ScanPoller } from "@/components/dashboard/scan-poller";
import { ScanProgressAnimation } from "@/components/dashboard/scan-progress-animation";
import { FindingCard, type FindingRow } from "@/components/dashboard/finding-card";
import { SEVERITY_LABEL, SEVERITY_ORDER, type Severity } from "@/lib/severity";
import { ArrowLeft, Globe, FileDown } from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";

export default async function ScanDetailPage({ params }: PageProps<"/scans/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: scan } = await supabase
    .from("scans")
    .select("*, targets(id, type, identifier)")
    .eq("id", id)
    .single();

  if (!scan) notFound();
  const target = scan.targets;

  const { data: findings } = await supabase
    .from("findings")
    .select("*")
    .eq("scan_id", scan.id);

  const grouped = new Map<Severity, FindingRow[]>();
  for (const sev of SEVERITY_ORDER) grouped.set(sev, []);
  for (const f of (findings as FindingRow[] | null) ?? []) {
    grouped.get(f.severity)?.push(f);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="mb-2 -ml-2" render={<Link href={`/targets/${target?.id}`} />}>
          <ArrowLeft className="size-4" />
          Back to target
        </Button>
        <div className="flex items-center gap-3">
          {target?.type === "repo" ? (
            <GithubIcon className="size-5 text-muted-foreground" />
          ) : (
            <Globe className="size-5 text-muted-foreground" />
          )}
          <h1 className="truncate font-heading text-2xl font-medium tracking-tight">{target?.identifier}</h1>
          <ScanStatusBadge status={scan.status as ScanStatus} />
          {scan.status === "done" && (
            <Button variant="outline" size="sm" className="ml-auto" render={<a href={`/api/scans/${scan.id}/report`} />}>
              <FileDown className="size-4" />
              PDF report
            </Button>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Scan started {scan.started_at ? new Date(scan.started_at).toLocaleString() : "—"}
          {scan.completed_at ? ` · completed ${new Date(scan.completed_at).toLocaleString()}` : ""}
        </p>
      </div>

      <ScanPoller status={scan.status as ScanStatus} />

      {scan.status === "queued" || scan.status === "running" ? (
        <ScanProgressAnimation targetType={target?.type as "repo" | "site" | undefined} />
      ) : scan.status === "failed" ? (
        <Card className="border-destructive/40">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            This scan failed before producing results. Check the audit log or try again.
          </CardContent>
        </Card>
      ) : !findings?.length ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No findings. Nothing turned up in this scan.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {SEVERITY_ORDER.map((sev) => {
            const items = grouped.get(sev) ?? [];
            if (items.length === 0) return null;
            return (
              <div key={sev} className="space-y-2">
                <h2 className="text-sm font-medium text-muted-foreground">
                  {SEVERITY_LABEL[sev]} ({items.length})
                </h2>
                <div className="space-y-2">
                  {items.map((f) => (
                    <FindingCard key={f.id} finding={f} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
