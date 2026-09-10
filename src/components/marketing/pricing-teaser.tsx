import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "Free",
    price: "₹0",
    cadence: "forever",
    features: ["1 target", "Manual scans", "Basic report"],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Pro",
    price: "₹1,999",
    cadence: "/mo",
    features: [
      "Unlimited targets",
      "Scheduled scans",
      "Priority scan queue",
      "Full PDF reports + email alerts",
    ],
    cta: "Go Pro",
    featured: true,
  },
];

export function PricingTeaser() {
  return (
    <section id="pricing" className="mx-auto max-w-4xl px-6 py-24">
      <div className="mx-auto mb-14 max-w-xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight">Simple pricing</h2>
        <p className="mt-3 text-muted-foreground">Start free. Upgrade when you have more than one thing to protect.</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {tiers.map((tier) => (
          <Card
            key={tier.name}
            className={tier.featured ? "border-primary/60 bg-card shadow-lg shadow-primary/10" : "border-border/70 bg-card/60"}
          >
            <CardHeader>
              <CardTitle className="flex items-baseline gap-1 text-xl">
                {tier.name}
                <span className="ml-auto text-2xl font-semibold">{tier.price}</span>
                <span className="text-sm font-normal text-muted-foreground">{tier.cadence}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="size-4 text-severity-low" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={tier.featured ? "default" : "outline"}
                render={<Link href="/signup" />}
              >
                {tier.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
