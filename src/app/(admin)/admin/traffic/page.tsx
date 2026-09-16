import { createServiceClient } from "@/lib/supabase/service";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/ui/animated-number";

export const dynamic = "force-dynamic";

const LOOKBACK_DAYS = 30;
const MAX_ROWS = 10000;

interface PageViewRow {
  path: string;
  referrer_host: string | null;
  utm_source: string | null;
  created_at: string;
}

function topEntries(counts: Map<string, number>, limit: number) {
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

export default async function AdminTrafficPage() {
  const service = createServiceClient();
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Logged fire-and-forget from proxy.ts (see lib/traffic.ts) — before
  // migration 0012 is applied, this table doesn't exist yet, so the
  // query errors and `views` is null; render the same "no data" empty
  // state that a genuinely quiet period would show, rather than crash.
  const { data: views } = await service
    .from("page_views")
    .select("path, referrer_host, utm_source, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS)
    .returns<PageViewRow[]>();

  const rows = views ?? [];

  const byReferrer = new Map<string, number>();
  const byPath = new Map<string, number>();
  const byUtmSource = new Map<string, number>();
  const byDay = new Map<string, number>();

  for (const row of rows) {
    const referrer = row.referrer_host ?? "Direct / no referrer";
    byReferrer.set(referrer, (byReferrer.get(referrer) ?? 0) + 1);
    byPath.set(row.path, (byPath.get(row.path) ?? 0) + 1);
    if (row.utm_source) byUtmSource.set(row.utm_source, (byUtmSource.get(row.utm_source) ?? 0) + 1);
    const day = row.created_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }

  const last7Days = [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 7)
    .reverse();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-medium tracking-tight">Traffic</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Where visits to hakscan.online are coming from, last {LOOKBACK_DAYS} days.
        </p>
      </div>

      <div className="rounded-md border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
        Logged first-party, server-side in <code className="rounded bg-muted px-1 py-0.5 text-xs">proxy.ts</code> for
        every real page load (not API calls or RSC prefetches) — separate from the Google Analytics tag on the site,
        which nothing here can pull numbers back out of without GA API credentials. This is the honest substitute:
        smaller, but it&apos;s live data from this app&apos;s own requests.
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Page views" value={rows.length} />
        <StatCard label="Unique referrers" value={byReferrer.size} />
        <StatCard label="UTM sources seen" value={byUtmSource.size} />
      </div>

      {last7Days.length > 0 && (
        <div>
          <h2 className="mb-3 font-heading text-sm font-medium tracking-wide text-muted-foreground">
            LAST 7 DAYS WITH TRAFFIC
          </h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {last7Days.map(([day, count]) => (
                <div key={day} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{day}</span>
                  <span className="tabular-nums font-medium">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <RankedList title="TOP REFERRERS" entries={topEntries(byReferrer, 10)} />
        <RankedList title="TOP UTM SOURCES" entries={topEntries(byUtmSource, 10)} emptyLabel="No UTM-tagged visits yet." />
      </div>

      <RankedList title="TOP PAGES" entries={topEntries(byPath, 10)} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="font-heading text-[11px] tracking-wide text-muted-foreground">{label.toUpperCase()}</p>
        <div className="mt-1 font-heading text-2xl font-medium">
          <AnimatedNumber value={value} />
        </div>
      </CardContent>
    </Card>
  );
}

function RankedList({
  title,
  entries,
  emptyLabel = "No data yet.",
}: {
  title: string;
  entries: [string, number][];
  emptyLabel?: string;
}) {
  return (
    <div>
      <h2 className="mb-3 font-heading text-sm font-medium tracking-wide text-muted-foreground">{title}</h2>
      <Card>
        <CardContent className="divide-y divide-border p-0">
          {entries.map(([label, count]) => (
            <div key={label} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span className="truncate">{label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{count}</span>
            </div>
          ))}
          {entries.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
