"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

interface RazorpayCheckoutOptions {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  prefill?: { email?: string };
  theme?: { color?: string };
  handler: (response: unknown) => void;
  modal?: { ondismiss?: () => void };
}

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Couldn't load the payment widget"));
    document.body.appendChild(script);
  });
}

export function UpgradeButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/subscribe", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message ?? "Couldn't start checkout");
        return;
      }

      await loadCheckoutScript();

      const razorpay = new window.Razorpay({
        key: json.keyId,
        subscription_id: json.subscriptionId,
        name: "Vibecoder Scanner",
        description: "Pro plan, monthly",
        prefill: { email: json.prefillEmail },
        theme: { color: "#6E56CF" },
        handler: () => {
          toast.success("Payment received. Activating your plan…");
          router.refresh();
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });
      razorpay.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start checkout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleUpgrade} disabled={loading}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
      Upgrade to Pro
    </Button>
  );
}
