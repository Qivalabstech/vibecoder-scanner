import { Badge } from "@/components/ui/badge";
import { SEVERITY_BG_CLASS, SEVERITY_LABEL, type Severity } from "@/lib/severity";
import { cn } from "@/lib/utils";

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", className)}>
      <span className={cn("size-1.5 rounded-full", SEVERITY_BG_CLASS[severity])} />
      {SEVERITY_LABEL[severity]}
    </Badge>
  );
}
