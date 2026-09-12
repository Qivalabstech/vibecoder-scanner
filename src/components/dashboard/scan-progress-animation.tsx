"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stage {
  label: string;
  detail: string;
  /** seconds after start this stage is expected to be reached — used only
   *  to pick which stage looks "active" from real elapsed time, never to
   *  fabricate a specific finish time. */
  atSeconds: number;
}

const REPO_STAGES: Stage[] = [
  { label: "Cloning repository", detail: "isolated container, --network none", atSeconds: 0 },
  { label: "Running Semgrep + Gitleaks", detail: "static analysis + secret detection", atSeconds: 10 },
  { label: "Triaging findings", detail: "deduplicating, assessing severity", atSeconds: 40 },
  { label: "Finalizing report", detail: "writing results", atSeconds: 70 },
];

const SITE_STAGES: Stage[] = [
  { label: "Resolving target", detail: "verifying reachability", atSeconds: 0 },
  { label: "Running ZAP baseline scan", detail: "passive checks only, no exploitation", atSeconds: 8 },
  { label: "Triaging findings", detail: "deduplicating, assessing severity", atSeconds: 60 },
  { label: "Finalizing report", detail: "writing results", atSeconds: 90 },
];

/**
 * Genuinely tied to `startedAt` (the scan's real `started_at` timestamp) —
 * not a fake timer that restarts. The stage list mirrors what
 * worker/scanners/*.ts actually does, in order; we don't have per-step
 * telemetry from the worker yet, so which stage looks "active" is inferred
 * from elapsed time rather than claimed as a live status feed.
 */
export function ScanProgressAnimation({
  targetType,
  startedAt,
}: {
  targetType: "repo" | "site" | undefined;
  startedAt: string | null;
}) {
  const stages = targetType === "site" ? SITE_STAGES : REPO_STAGES;
  const [elapsed, setElapsed] = useState(() => secondsSince(startedAt));

  useEffect(() => {
    const id = setInterval(() => setElapsed(secondsSince(startedAt)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const activeIndex = stages.reduce(
    (acc, stage, i) => (elapsed >= stage.atSeconds ? i : acc),
    0
  );

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-4 py-2.5 font-heading text-[11px] tracking-wider text-muted-foreground">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-severity-medium opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-severity-medium" />
        </span>
        SCAN IN PROGRESS
        <span className="ml-auto tabular-nums">{formatElapsed(elapsed)} elapsed</span>
      </div>

      <ol className="space-y-0 px-5 py-6">
        {stages.map((stage, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex;
          const isLast = i === stages.length - 1;
          return (
            <li key={stage.label} className="relative flex gap-4 pb-8 last:pb-0">
              {!isLast && (
                <span
                  className={cn(
                    "absolute left-[11px] top-6 h-full w-px transition-colors duration-700",
                    done ? "bg-primary" : "bg-border"
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-500",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary text-primary",
                  !done && !active && "border-border text-muted-foreground"
                )}
              >
                {done ? (
                  <Check className="size-3.5" strokeWidth={3} />
                ) : active ? (
                  <span className="size-2 animate-scan-pulse rounded-full bg-primary" />
                ) : (
                  <span className="size-1.5 rounded-full bg-border" />
                )}
              </span>
              <div className="pt-0.5">
                <p
                  className={cn(
                    "font-heading text-sm",
                    active ? "text-foreground" : done ? "text-foreground/80" : "text-muted-foreground"
                  )}
                >
                  {stage.label}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{stage.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="border-t border-border bg-secondary/20 px-5 py-3 text-xs text-muted-foreground">
        This page updates automatically — no need to refresh. Larger repos and
        sites can take several minutes.
      </p>
    </div>
  );
}

function secondsSince(iso: string | null): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
}

function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
