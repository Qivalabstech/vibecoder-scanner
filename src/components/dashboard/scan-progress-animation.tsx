"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const REPO_LINES = [
  "resolving repository...",
  "cloning into isolated container (--network none)...",
  "spinning up semgrep sandbox...",
  "walking source tree...",
  "matching ruleset against source...",
  "spinning up gitleaks sandbox...",
  "scanning history for exposed secrets...",
  "deduplicating raw matches...",
];

const SITE_LINES = [
  "resolving target host...",
  "spinning up zap-baseline sandbox (bridge network)...",
  "crawling reachable pages...",
  "passive checks: headers, cookies, TLS config...",
  "passive checks: content security policy...",
  "passive checks: information disclosure...",
  "collecting alerts...",
];

/**
 * Purely illustrative — the worker doesn't stream real log lines to the
 * browser yet, so this narrates the *shape* of what's actually happening
 * server-side (see worker/scanners/*.ts) without claiming to be live
 * tool output or real findings.
 */
export function ScanProgressAnimation({ targetType }: { targetType: "repo" | "site" | undefined }) {
  const reducedMotion = useReducedMotion();
  const lines = targetType === "site" ? SITE_LINES : REPO_LINES;
  const [visible, setVisible] = useState<number[]>(reducedMotion ? lines.map((_, i) => i) : []);
  const indexRef = useRef(0);

  useEffect(() => {
    if (reducedMotion) return;
    indexRef.current = 0;
    setVisible([]);
    const id = setInterval(() => {
      setVisible((prev) => {
        const next = indexRef.current % lines.length;
        indexRef.current += 1;
        if (next === 0) return [0];
        return [...prev, next];
      });
    }, 1400);
    return () => clearInterval(id);
  }, [lines, reducedMotion]);

  return (
    <div className="scanlines overflow-hidden rounded-md border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-4 py-2 font-heading text-[11px] tracking-wider text-muted-foreground">
        <RadarSweep />
        <span>SANDBOX_WORKER // LIVE</span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-severity-medium shadow-[0_0_6px] shadow-severity-medium animate-pulse" />
          running
        </span>
      </div>

      <div className="min-h-[220px] space-y-1.5 px-4 py-4 font-mono text-[13px] leading-relaxed">
        <AnimatePresence initial={false}>
          {visible.map((lineIndex, position) => (
            <motion.div
              key={`${lineIndex}-${position}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: position === visible.length - 1 ? 1 : 0.45, y: 0 }}
              transition={{ duration: 0.25 }}
              className="flex gap-2 text-muted-foreground"
            >
              <span className="text-primary/70 select-none">›</span>
              <span>{lines[lineIndex]}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {!reducedMotion && (
          <motion.span
            aria-hidden
            className="inline-block h-3.5 w-[7px] translate-y-0.5 bg-primary/80"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
          />
        )}
      </div>
    </div>
  );
}

function RadarSweep() {
  const reducedMotion = useReducedMotion();
  return (
    <span className="relative flex size-3.5 items-center justify-center overflow-hidden rounded-full border border-primary/50">
      <motion.span
        className="absolute inset-0"
        style={{
          background: "conic-gradient(from 0deg, var(--color-primary) 0deg, transparent 70deg)",
        }}
        animate={reducedMotion ? undefined : { rotate: 360 }}
        transition={reducedMotion ? undefined : { duration: 1.6, repeat: Infinity, ease: "linear" }}
      />
    </span>
  );
}
