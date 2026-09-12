"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export function PricingForm({ initialPrice }: { initialPrice: number }) {
  const router = useRouter();
  const [price, setPrice] = useState(String(initialPrice));
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(price);
    if (!Number.isInteger(parsed) || parsed < 0) {
      toast.error("Enter a whole number of rupees, 0 or more.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/admin/pricing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proPriceInr: parsed }),
    });
    setLoading(false);
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      toast.error(json?.message ?? "Couldn't update the price.");
      return;
    }
    toast.success("Displayed price updated.");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="price">Pro plan price (₹/month)</Label>
            <Input
              id="price"
              type="number"
              min={0}
              step={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Update displayed price"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
