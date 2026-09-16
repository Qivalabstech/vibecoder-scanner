"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

declare global {
  interface Window {
    paypal?: {
      Buttons: (options: PaypalButtonsOptions) => { render: (selector: string) => void };
    };
  }
}

interface PaypalButtonsOptions {
  style?: { shape?: string; color?: string; label?: string };
  createSubscription: () => Promise<string>;
  onApprove: () => void;
  onError: (err: unknown) => void;
}

function loadPaypalSdk(clientId: string): Promise<void> {
  if (window.paypal) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&vault=true&intent=subscription`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Couldn't load the payment widget"));
    document.body.appendChild(script);
  });
}

export function UpgradeButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPaypalButton, setShowPaypalButton] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [showPromoInput, setShowPromoInput] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoChecking, setPromoChecking] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; type: "percent" | "fixed"; value: number } | null>(
    null
  );

  async function handleApplyPromo() {
    const code = promoCode.trim();
    if (!code) return;
    setPromoChecking(true);
    try {
      const res = await fetch("/api/billing/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok || !json.valid) {
        const reasonMessage: Record<string, string> = {
          not_found: "That code isn't valid.",
          exhausted: "That code has already been fully redeemed.",
          already_redeemed: "You've already used that code.",
        };
        toast.error(reasonMessage[json.reason] ?? "That code isn't valid.");
        setAppliedPromo(null);
        return;
      }
      setAppliedPromo({ code, type: json.discountType, value: json.discountValue });
      toast.success("Promo code applied.");
    } catch {
      toast.error("Couldn't check that code — try again.");
    } finally {
      setPromoChecking(false);
    }
  }

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appliedPromo ? { promoCode: appliedPromo.code } : {}),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message ?? "Couldn't start checkout");
        return;
      }

      await loadPaypalSdk(json.clientId);
      if (!window.paypal || !containerRef.current) {
        toast.error("Couldn't load the payment widget");
        return;
      }

      setShowPaypalButton(true);
      window.paypal
        .Buttons({
          style: { shape: "rect", color: "gold", label: "subscribe" },
          // The subscription was already created server-side by the call
          // above — PayPal's Buttons component accepts an existing
          // subscription id instead of creating one itself.
          createSubscription: async () => json.subscriptionId,
          onApprove: () => {
            toast.success("Subscription approved. Activating your plan…");
            router.refresh();
          },
          onError: (err) => {
            toast.error(err instanceof Error ? err.message : "Payment couldn't be completed");
          },
        })
        .render(`#${containerRef.current.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start checkout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {!showPaypalButton && (
        <div>
          {!showPromoInput && !appliedPromo && (
            <button
              type="button"
              onClick={() => setShowPromoInput(true)}
              className="text-xs text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
            >
              Have a promo code?
            </button>
          )}
          {showPromoInput && !appliedPromo && (
            <div className="flex items-center gap-2">
              <Input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="PROMO CODE"
                className="h-8 max-w-40 font-mono text-xs uppercase"
              />
              <Button variant="outline" size="sm" onClick={handleApplyPromo} disabled={promoChecking || !promoCode.trim()}>
                {promoChecking ? <Loader2 className="size-3.5 animate-spin" /> : "Apply"}
              </Button>
            </div>
          )}
          {appliedPromo && (
            <p className="flex items-center gap-1.5 text-xs text-severity-low">
              <Check className="size-3.5" />
              <span className="font-mono">{appliedPromo.code}</span> applied —{" "}
              {appliedPromo.type === "percent" ? `${appliedPromo.value}% off` : `$${appliedPromo.value} off`}
            </p>
          )}
        </div>
      )}

      <div id="paypal-upgrade-button" ref={containerRef} className={showPaypalButton ? "min-w-40" : "hidden"} />
      {!showPaypalButton && (
        <Button onClick={handleUpgrade} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Upgrade to Pro
        </Button>
      )}
    </div>
  );
}
