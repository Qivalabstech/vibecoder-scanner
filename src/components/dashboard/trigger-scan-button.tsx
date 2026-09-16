"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function TriggerScanButton({ targetId, verified }: { targetId: string; verified: boolean }) {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);

  async function triggerScan() {
    setScanning(true);
    try {
      const res = await fetch(`/api/targets/${targetId}/scan`, { method: "POST" });
      // A non-JSON response (a proxy/platform error page, not our own
      // route) used to throw here uncaught, past the line that resets
      // scanning — the button would spin forever with no error shown,
      // indistinguishable from "nothing happened".
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) {
        toast.error(json?.message ?? "Couldn't start scan — try again.");
        return;
      }
      toast.success("Scan queued");
      router.push(`/scans/${json.scan.id}`);
    } catch {
      toast.error("Couldn't reach the server — check your connection and try again.");
    } finally {
      setScanning(false);
    }
  }

  return (
    <Button disabled={!verified || scanning} onClick={triggerScan}>
      {scanning ? <Loader2 className="size-4 animate-spin" /> : <ScanSearch className="size-4" />}
      Scan now
    </Button>
  );
}
