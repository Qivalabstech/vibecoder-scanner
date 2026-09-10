"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CancelSubscriptionButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    setLoading(true);
    const res = await fetch("/api/billing/cancel", { method: "POST" });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(json.message ?? "Couldn't cancel subscription");
      return;
    }
    toast.success(json.message ?? "Subscription set to cancel");
    router.refresh();
  }

  return (
    <Button variant="outline" onClick={handleCancel} disabled={loading}>
      {loading && <Loader2 className="size-4 animate-spin" />}
      Cancel subscription
    </Button>
  );
}
