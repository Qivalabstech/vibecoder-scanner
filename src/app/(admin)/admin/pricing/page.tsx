import { createServiceClient } from "@/lib/supabase/service";
import { PricingForm } from "@/components/admin/pricing-form";

export const dynamic = "force-dynamic";

export default async function AdminPricingPage() {
  const service = createServiceClient();
  const { data: pricing } = await service.from("pricing_config").select("pro_price_usd").eq("id", 1).single();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-medium tracking-tight">Pricing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Change what the marketing page shows for the Pro plan.
        </p>
      </div>

      <PricingForm initialPrice={pricing?.pro_price_usd ?? 24} />

      <div className="rounded-md border border-severity-medium/30 bg-severity-medium/10 p-4 text-sm">
        <p className="font-heading text-xs font-medium tracking-wide text-severity-medium">
          THIS ONLY CHANGES THE DISPLAYED PRICE
        </p>
        <p className="mt-2 text-muted-foreground">
          What a new subscriber is actually charged is controlled by the PayPal Plan
          referenced by <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">PAYPAL_PLAN_ID</code>.
          To change the real billed amount:
        </p>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-muted-foreground">
          <li>Go to the PayPal developer dashboard → Products &amp; Plans.</li>
          <li>PayPal plans are effectively fixed once subscribers exist — create a new plan at the new amount.</li>
          <li>Update <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">PAYPAL_PLAN_ID</code> to the new plan&apos;s ID and redeploy.</li>
          <li>Come back here and update the displayed price to match.</li>
        </ol>
        <p className="mt-2 text-muted-foreground">
          Existing subscribers keep their original plan/price until they cancel and resubscribe —
          PayPal doesn&apos;t support changing an active subscription&apos;s amount in place.
        </p>
        <p className="mt-2 text-muted-foreground">
          Cancellation is also immediate on PayPal — there&apos;s no &quot;cancel at period end&quot;, so a
          cancelled subscriber drops to Free right away rather than at the close of their billing period.
        </p>
      </div>
    </div>
  );
}
