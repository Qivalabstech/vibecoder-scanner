import { MarketingNav } from "@/components/marketing/nav";
import { MarketingHero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { PricingTeaser } from "@/components/marketing/pricing-teaser";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: pricing } = await supabase.from("pricing_config").select("pro_price_usd").eq("id", 1).single();
  const proPriceUsd = pricing?.pro_price_usd ?? 24;

  return (
    <>
      <MarketingNav />
      <main className="flex-1">
        <MarketingHero />
        <HowItWorks />
        <PricingTeaser proPriceUsd={proPriceUsd} />
      </main>
      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto max-w-6xl px-6 text-sm text-muted-foreground">
          Hakscan requires an ownership attestation before every scan. See our{" "}
          <a href="/legal/terms" className="underline underline-offset-4">
            Terms of Service
          </a>
          .
        </div>
      </footer>
    </>
  );
}
