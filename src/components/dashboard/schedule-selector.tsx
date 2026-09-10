"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export type ScanFrequency = "none" | "weekly" | "monthly";

export function ScheduleSelector({
  targetId,
  frequency,
  canSchedule,
}: {
  targetId: string;
  frequency: ScanFrequency;
  canSchedule: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleChange(value: string | null) {
    if (!value) return;
    setSaving(true);
    const res = await fetch(`/api/targets/${targetId}/schedule`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frequency: value }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(json.message ?? "Couldn't update schedule");
      return;
    }
    toast.success(value === "none" ? "Scheduled scans turned off" : `Scanning ${value}`);
    router.refresh();
  }

  if (!canSchedule) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="size-3.5" />
        Scheduled re-scans are a paid-plan feature
      </div>
    );
  }

  return (
    <Select
      items={{ none: "Manual only", weekly: "Weekly", monthly: "Monthly" }}
      value={frequency}
      onValueChange={handleChange}
      disabled={saving}
    >
      <SelectTrigger size="sm" className="w-40">
        <SelectValue placeholder="Scan schedule" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Manual only</SelectItem>
        <SelectItem value="weekly">Weekly</SelectItem>
        <SelectItem value="monthly">Monthly</SelectItem>
      </SelectContent>
    </Select>
  );
}
