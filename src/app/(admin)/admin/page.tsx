import { createServiceClient } from "@/lib/supabase/service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const service = createServiceClient();

  const [
    { data: users },
    { count: targetsTotal },
    { count: targetsVerified },
    { data: scans },
    { data: pricing },
    { data: recentAudit },
  ] = await Promise.all([
    service.from("users").select("id, email, plan, created_at").order("created_at", { ascending: false }),
    service.from("targets").select("*", { count: "exact", head: true }),
    service.from("targets").select("*", { count: "exact", head: true }).eq("verified", true),
    service.from("scans").select("id, status, target_id, created_at"),
    service.from("pricing_config").select("pro_price_usd").eq("id", 1).single(),
    service
      .from("audit_log")
      .select("id, action, metadata, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const allUsers = users ?? [];
  const freeUsers = allUsers.filter((u) => u.plan === "free");
  const paidUsers = allUsers.filter((u) => u.plan === "paid");
  const proPrice = pricing?.pro_price_usd ?? 0;
  const estimatedMrr = paidUsers.length * proPrice;

  const allScans = scans ?? [];
  const scansByStatus = {
    done: allScans.filter((s) => s.status === "done").length,
    failed: allScans.filter((s) => s.status === "failed").length,
    running: allScans.filter((s) => s.status === "running" || s.status === "queued").length,
  };
  // targets scanned per user isn't tracked directly on `targets`, but
  // scans reference target_id — a rough per-user activity signal without
  // an extra join: count of targets each user has.
  const targetCountsPerUser = new Map<string, number>();
  const { data: allTargets } = await service.from("targets").select("user_id");
  for (const t of allTargets ?? []) {
    targetCountsPerUser.set(t.user_id, (targetCountsPerUser.get(t.user_id) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-medium tracking-tight">System overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everyone enrolled, what plan they&apos;re on, and whether the pipeline is actually running.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total users" value={allUsers.length} />
        <StatCard label="Free plan" value={freeUsers.length} />
        <StatCard label="Paid plan" value={paidUsers.length} />
        <StatCard
          label="Est. MRR"
          value={`$${estimatedMrr.toLocaleString("en-US")}`}
          hint={`${paidUsers.length} × $${proPrice.toLocaleString("en-US")} — estimate, not a Razorpay ledger total`}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Verified targets" value={`${targetsVerified ?? 0} / ${targetsTotal ?? 0}`} />
        <StatCard label="Scans completed" value={scansByStatus.done} />
        <StatCard label="Scans failed" value={scansByStatus.failed} />
        <StatCard label="In progress now" value={scansByStatus.running} />
      </div>

      <div>
        <h2 className="mb-3 font-heading text-sm font-medium tracking-wide text-muted-foreground">
          USERS ({allUsers.length})
        </h2>
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left font-heading text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Plan</th>
                  <th className="px-4 py-2 font-medium">Targets</th>
                  <th className="px-4 py-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-none">
                    <td className="max-w-56 truncate px-4 py-2.5">{u.email}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={u.plan === "paid" ? "default" : "outline"} className="text-[11px]">
                        {u.plan}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                      {targetCountsPerUser.get(u.id) ?? 0}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {allUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No users yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 font-heading text-sm font-medium tracking-wide text-muted-foreground">
          RECENT ACTIVITY // SYSTEM HEALTH
        </h2>
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {(recentAudit ?? []).map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="font-mono text-xs text-muted-foreground">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
                <span className="font-heading text-xs">{entry.action}</span>
              </div>
            ))}
            {(!recentAudit || recentAudit.length === 0) && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No audit log activity yet — this feed is real, not simulated, so it&apos;ll fill in as
                people use the product.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="font-heading text-[11px] tracking-wide text-muted-foreground">{label.toUpperCase()}</p>
        <p className="mt-1 font-heading text-2xl font-medium">{value}</p>
        {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
