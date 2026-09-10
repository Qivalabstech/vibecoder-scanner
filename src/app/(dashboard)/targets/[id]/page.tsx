import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TriggerScanButton } from "@/components/dashboard/trigger-scan-button";
import { ScheduleSelector } from "@/components/dashboard/schedule-selector";
import { ScanStatusBadge, type ScanStatus } from "@/components/dashboard/scan-status-badge";
import { SEVERITY_BG_CLASS, SEVERITY_ORDER, type Severity } from "@/lib/severity";
import { ArrowLeft, Globe, ShieldCheck } from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { cn } from "@/lib/utils";

export default async function TargetDetailPage({ params }: PageProps<"/targets/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: target } = await supabase.from("targets").select("*").eq("id", id).single();
  if (!target) notFound();

  const { data: profile } = await supabase.from("users").select("plan").single();

  const { data: scans } = await supabase
    .from("scans")
    .select("*")
    .eq("target_id", target.id)
    .order("created_at", { ascending: false });

  const scanIds = (scans ?? []).map((s) => s.id);
  const { data: findings } = scanIds.length
    ? await supabase.from("findings").select("scan_id, severity").in("scan_id", scanIds)
    : { data: [] };

  const countsByScan = new Map<string, Record<Severity, number>>();
  for (const f of findings ?? []) {
    const counts = countsByScan.get(f.scan_id) ?? { critical: 0, high: 0, medium: 0, low: 0 };
    counts[f.severity as Severity] += 1;
    countsByScan.set(f.scan_id, counts);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="mb-2 -ml-2" render={<Link href="/targets" />}>
          <ArrowLeft className="size-4" />
          All targets
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          {target.type === "repo" ? (
            <GithubIcon className="size-5 text-muted-foreground" />
          ) : (
            <Globe className="size-5 text-muted-foreground" />
          )}
          <h1 className="truncate text-2xl font-semibold tracking-tight">{target.identifier}</h1>
          {target.verified ? (
            <Badge variant="secondary" className="gap-1 text-severity-low">
              <ShieldCheck className="size-3" />
              Verified
            </Badge>
          ) : (
            <Badge variant="outline" className="text-severity-medium">
              Pending verification
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-3">
            <ScheduleSelector
              targetId={target.id}
              frequency={target.scan_frequency}
              canSchedule={profile?.plan === "paid"}
            />
            <TriggerScanButton targetId={target.id} verified={target.verified} />
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Scan history</h2>
        {!scans?.length ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No scans yet. Run the first one above.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {scans.map((scan) => {
              const counts = countsByScan.get(scan.id);
              return (
                <Link key={scan.id} href={`/scans/${scan.id}`}>
                  <Card className="transition-colors hover:bg-accent/40">
                    <CardContent className="flex items-center gap-4 py-3">
                      <ScanStatusBadge status={scan.status as ScanStatus} />
                      <span className="text-sm text-muted-foreground">
                        {new Date(scan.created_at).toLocaleString()}
                      </span>
                      <div className="ml-auto flex items-center gap-3">
                        {counts &&
                          SEVERITY_ORDER.filter((sev) => counts[sev] > 0).map((sev) => (
                            <span key={sev} className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span className={cn("size-1.5 rounded-full", SEVERITY_BG_CLASS[sev])} />
                              {counts[sev]}
                            </span>
                          ))}
                        {scan.status === "done" && !counts && (
                          <span className="text-xs text-muted-foreground">No findings</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
