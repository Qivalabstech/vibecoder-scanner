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
    const res = await fetch(`/api/targets/${targetId}/scan`, { method: "POST" });
    const json = await res.json();
    setScanning(false);
    if (!res.ok) {
      toast.error(json.message ?? "Couldn't start scan");
      return;
    }
    toast.success("Scan queued");
    router.push(`/scans/${json.scan.id}`);
  }

  return (
    <Button disabled={!verified || scanning} onClick={triggerScan}>
      {scanning ? <Loader2 className="size-4 animate-spin" /> : <ScanSearch className="size-4" />}
      Scan now
    </Button>
  );
}
