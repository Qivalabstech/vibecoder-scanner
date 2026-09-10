"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const ScanGlobeScene = dynamic(() => import("./scan-globe-scene"), {
  ssr: false,
  loading: () => null,
});

function StaticFallback() {
  return (
    <div
      className="size-full rounded-full"
      style={{
        background:
          "radial-gradient(circle at 50% 45%, oklch(0.4 0.12 280 / 0.55), transparent 60%), conic-gradient(from 0deg, oklch(0.55 0.19 280 / 0.25), oklch(0.6 0.15 200 / 0.2), oklch(0.55 0.19 280 / 0.25))",
        boxShadow: "0 0 120px oklch(0.55 0.19 280 / 0.25) inset",
      }}
      aria-hidden
    />
  );
}

function isLowEndDevice() {
  if (typeof navigator === "undefined") return false;
  const cores = navigator.hardwareConcurrency ?? 4;
  // deviceMemory is non-standard/optional
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  return cores <= 2 || memory <= 2;
}

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

function noopSubscribe() {
  return () => {};
}

function getCapabilitySnapshot() {
  return !isLowEndDevice() && hasWebGL();
}

function getServerCapabilitySnapshot() {
  return false;
}

export function ScanVisual({ className }: { className?: string }) {
  const reducedMotion = useReducedMotion();
  // static feature check — subscribe is a no-op since capability never changes post-mount
  const canRender3d = useSyncExternalStore(
    noopSubscribe,
    getCapabilitySnapshot,
    getServerCapabilitySnapshot
  );

  const use3d = canRender3d && !reducedMotion;

  return (
    <div className={className}>
      {use3d ? <ScanGlobeScene /> : <StaticFallback />}
    </div>
  );
}
