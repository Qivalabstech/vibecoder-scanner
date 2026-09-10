import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, Plus } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: targets } = await supabase.from("targets").select("*");

  const verifiedCount = targets?.filter((t) => t.verified).length ?? 0;
  const pendingCount = (targets?.length ?? 0) - verifiedCount;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything you&apos;ve verified and everything still pending.
          </p>
        </div>
        <Button render={<Link href="/targets/new" />}>
          <Plus className="size-4" />
          Add target
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <ShieldCheck className="size-5 text-severity-low" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Verified targets</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{verifiedCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <ShieldAlert className="size-5 text-severity-medium" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending verification</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{pendingCount}</CardContent>
        </Card>
      </div>

      {!targets?.length && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No targets yet. Add a repo or site to start your first scan.
            </p>
            <Button render={<Link href="/targets/new" />}>
              <Plus className="size-4" />
              Add your first target
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
