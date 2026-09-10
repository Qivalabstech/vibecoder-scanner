import { Loader2, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ScanStatus = "queued" | "running" | "done" | "failed";

const CONFIG: Record<ScanStatus, { label: string; icon: typeof Clock; className: string }> = {
  queued: { label: "Queued", icon: Clock, className: "text-muted-foreground" },
  running: { label: "Running", icon: Loader2, className: "text-severity-medium" },
  done: { label: "Done", icon: CheckCircle2, className: "text-severity-low" },
  failed: { label: "Failed", icon: XCircle, className: "text-severity-critical" },
};

export function ScanStatusBadge({ status }: { status: ScanStatus }) {
  const { label, icon: Icon, className } = CONFIG[status];
  return (
    <Badge variant="outline" className={cn("gap-1.5", className)}>
      <Icon className={cn("size-3", status === "running" && "animate-spin")} />
      {label}
    </Badge>
  );
}
