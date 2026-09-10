import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TargetCard } from "@/components/dashboard/target-card";
import { Plus } from "lucide-react";

export default async function TargetsPage() {
  const supabase = await createClient();
  const { data: targets } = await supabase
    .from("targets")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Targets</h1>
          <p className="mt-1 text-sm text-muted-foreground">Repos and sites you&apos;ve added.</p>
        </div>
        <Button render={<Link href="/targets/new" />}>
          <Plus className="size-4" />
          Add target
        </Button>
      </div>

      {targets?.length ? (
        <div className="space-y-3">
          {targets.map((t) => (
            <TargetCard key={t.id} target={t} />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No targets yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
