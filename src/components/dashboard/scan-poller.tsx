"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ScanStatus } from "@/components/dashboard/scan-status-badge";

/**
 * No push mechanism exists yet (Phase 6's email/webhook layer isn't built),
 * so this just re-fetches the server component every few seconds while the
 * scan is still in flight.
 */
export function ScanPoller({ status }: { status: ScanStatus }) {
  const router = useRouter();

  useEffect(() => {
    if (status !== "queued" && status !== "running") return;
    const interval = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(interval);
  }, [status, router]);

  return null;
}
