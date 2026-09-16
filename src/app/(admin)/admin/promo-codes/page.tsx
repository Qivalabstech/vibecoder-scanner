import { createServiceClient } from "@/lib/supabase/service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PromoCodeForm } from "@/components/admin/promo-code-form";
import { PromoCodeToggle } from "@/components/admin/promo-code-toggle";

export const dynamic = "force-dynamic";

export default async function AdminPromoCodesPage() {
  const service = createServiceClient();
  const { data: codes } = await service
    .from("promo_codes")
    .select("id, code, discount_type, discount_value, paypal_plan_id, max_redemptions, redemption_count, active, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-medium tracking-tight">Promo codes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Discounts for partners and promotional sends. Redeemed at checkout on the Billing page.
        </p>
      </div>

      <div className="rounded-md border border-severity-medium/30 bg-severity-medium/10 p-4 text-sm">
        <p className="font-heading text-xs font-medium tracking-wide text-severity-medium">
          CREATING A CODE CREATES A REAL, LIVE PAYPAL PLAN
        </p>
        <p className="mt-2 text-muted-foreground">
          PayPal subscriptions have no coupon API — a discount only works by putting the subscriber on a
          different PayPal Plan already priced at the discounted amount, same as changing the base Pro
          price (see the Pricing tab). Creating a code here calls PayPal&apos;s live billing API and
          creates that plan automatically, priced off PayPal&apos;s own current Pro price — no manual
          dashboard step. That plan is immediately active in your real PayPal account the moment this
          succeeds, whether or not you go on to actually use the code.
        </p>
      </div>

      <PromoCodeForm />

      <div>
        <h2 className="mb-3 font-heading text-sm font-medium tracking-wide text-muted-foreground">
          CODES ({codes?.length ?? 0})
        </h2>
        <div className="space-y-3">
          {(codes ?? []).map((c) => (
            <Card key={c.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{c.code}</span>
                    <Badge variant={c.active ? "default" : "outline"} className="text-[11px]">
                      {c.active ? "active" : "inactive"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.discount_type === "percent" ? `${c.discount_value}% off` : `$${c.discount_value} off`} ·
                    plan <span className="font-mono">{c.paypal_plan_id}</span>
                  </p>
                  <p className="mt-1 tabular-nums text-xs text-muted-foreground">
                    {c.redemption_count} / {c.max_redemptions} redeemed
                  </p>
                </div>
                <PromoCodeToggle id={c.id} active={c.active} />
              </CardContent>
            </Card>
          ))}
          {(!codes || codes.length === 0) && (
            <p className="rounded-md border border-border/60 bg-card/40 px-4 py-8 text-center text-sm text-muted-foreground">
              No promo codes yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
