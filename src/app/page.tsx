import { MarketingNav } from "@/components/marketing/nav";
import { MarketingHero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { PricingTeaser } from "@/components/marketing/pricing-teaser";
import { MarketingFooter } from "@/components/marketing/footer";
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
      <MarketingFooter />
    </>
  );
}
