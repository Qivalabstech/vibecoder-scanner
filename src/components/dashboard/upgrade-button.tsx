"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/subscribe", { method: "POST" });
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
    <div>
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
