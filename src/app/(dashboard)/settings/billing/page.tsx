import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { UpgradeButton } from "@/components/dashboard/upgrade-button";
import { CancelSubscriptionButton } from "@/components/dashboard/cancel-subscription-button";

const PRO_FEATURES = [
  "Unlimited targets",
  "Scheduled scans (weekly or monthly)",
  "Priority scan queue",
  "Full PDF reports + email alerts",
];

export default async function BillingSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("plan, plan_renews_at")
    .eq("id", user!.id)
    .single();

  const isPaid = profile?.plan === "paid";

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your plan.</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              {isPaid ? "Pro" : "Free"}
              {isPaid && <Badge variant="secondary">Active</Badge>}
            </CardTitle>
            {isPaid && profile?.plan_renews_at && (
              <p className="mt-1 text-xs text-muted-foreground">
                Renews {new Date(profile.plan_renews_at).toLocaleDateString()}
              </p>
            )}
          </div>
          {isPaid ? <CancelSubscriptionButton /> : <UpgradeButton />}
        </CardHeader>
        <CardContent>
          {isPaid ? (
            <ul className="space-y-2 text-sm text-muted-foreground">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="size-4 text-severity-low" />
                  {f}
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You&apos;re on the free plan: 1 target, manual scans only. Upgrade for:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="size-4 text-severity-low" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
