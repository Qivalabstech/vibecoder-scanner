"use client";

import { useEffect } from "react";
import Link from "next/link";
import { HakscanMark } from "@/components/brand/mark";

// Server Component errors already arrive here with a generic message
// (Next.js strips the real one in production, keeping only `digest` —
// see error.js docs), so logging `error` here is safe: nothing
// sensitive to leak, and the digest is what actually helps match this
// to server-side logs.
export default function GlobalErrorBoundary({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[error boundary]", error.digest ?? error.message);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: 24,
        background: "#0a0d0f",
        color: "#f5f7f6",
        fontFamily: "var(--font-jbm), monospace",
        textAlign: "center",
      }}
    >
      <HakscanMark size={40} />
      <div>
        <p style={{ fontSize: 13, letterSpacing: "0.08em", color: "#fbbf24", margin: "0 0 8px" }}>ERROR</p>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px" }}>Something went wrong</h1>
        <p style={{ fontSize: 14, color: "#7c8a8d", margin: 0 }}>
          {error.digest ? `Reference: ${error.digest}` : "Try again, or head back home."}
        </p>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button
          type="button"
          onClick={() => retry()}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            background: "#00d9b5",
            color: "#0a0d0f",
            fontWeight: 700,
            fontSize: 14,
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Try again
        </button>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "10px 20px",
            borderRadius: 8,
            border: "1px solid #1c2427",
            color: "#f5f7f6",
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
