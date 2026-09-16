"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function PromoCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const discountValueNum = Number(discountValue);
    const maxRedemptionsNum = Number(maxRedemptions);
    if (!code.trim()) {
      toast.error("Enter a code.");
      return;
    }
    if (!Number.isFinite(discountValueNum) || discountValueNum <= 0) {
      toast.error("Enter a discount value greater than 0.");
      return;
    }
    if (discountType === "percent" && discountValueNum >= 100) {
      toast.error("A percent discount has to be less than 100.");
      return;
    }
    if (!Number.isInteger(maxRedemptionsNum) || maxRedemptionsNum <= 0) {
      toast.error("Enter a whole number of redemptions greater than 0.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/admin/promo-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.trim(),
        discountType,
        discountValue: discountValueNum,
        maxRedemptions: maxRedemptionsNum,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      toast.error(json?.message ?? "Couldn't create the code.");
      return;
    }

    toast.success("Promo code created — the PayPal plan is live.");
    setCode("");
    setDiscountValue("");
    setMaxRedemptions("");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="promo-code">Code</Label>
            <Input
              id="promo-code"
              placeholder="LAUNCH50"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="font-mono uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="promo-discount-type">Discount type</Label>
              <Select value={discountType} onValueChange={(v) => setDiscountType(v as "percent" | "fixed")}>
                <SelectTrigger id="promo-discount-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percent off</SelectItem>
                  <SelectItem value="fixed">Fixed amount off</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-discount-value">
                {discountType === "percent" ? "Percent off" : "Amount off ($)"}
              </Label>
              <Input
                id="promo-discount-value"
                type="number"
                min={0}
                step={discountType === "percent" ? 1 : 0.01}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="promo-max-redemptions">Max redemptions</Label>
            <Input
              id="promo-max-redemptions"
              type="number"
              min={1}
              step={1}
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? "Creating the real PayPal plan…" : "Create promo code"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
