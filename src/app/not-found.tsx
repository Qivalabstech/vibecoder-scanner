import Link from "next/link";
import { HakscanMark } from "@/components/brand/mark";

// Next's default 404 only follows the OS color scheme (it renders inside
// the root layout but doesn't read our own dark theme), so it reads as
// an unstyled flash on a branded site. This one uses the same ink/paper/
// teal tokens as the landing/auth pages, inline rather than through a
// CSS module since this single small page doesn't need one.
export default function NotFound() {
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
        <p style={{ fontSize: 13, letterSpacing: "0.08em", color: "#00d9b5", margin: "0 0 8px" }}>404</p>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px" }}>Page not found</h1>
        <p style={{ fontSize: 14, color: "#7c8a8d", margin: 0 }}>
          Whatever you were looking for isn&apos;t here.
        </p>
      </div>
      <Link
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "10px 20px",
          borderRadius: 8,
          background: "#00d9b5",
          color: "#0a0d0f",
          fontWeight: 700,
          fontSize: 14,
          textDecoration: "none",
        }}
      >
        Back to home
      </Link>
    </div>
  );
}
