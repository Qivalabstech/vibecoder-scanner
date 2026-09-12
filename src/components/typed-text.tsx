"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/**
 * Terminal-style typewriter. Types once on mount; skips straight to the
 * full string under prefers-reduced-motion instead of animating.
 */
export function TypedText({ text, speedMs = 22 }: { text: string; speedMs?: number }) {
  const reducedMotion = useReducedMotion();
  const [shown, setShown] = useState(reducedMotion ? text : "");

  useEffect(() => {
    if (reducedMotion) {
      setShown(text);
      return;
    }
    setShown("");
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speedMs);
    return () => clearInterval(id);
  }, [text, speedMs, reducedMotion]);

  return <span>{shown}</span>;
}
