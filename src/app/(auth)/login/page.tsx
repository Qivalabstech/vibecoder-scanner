import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Log in, Hakscan",
  description: "Log in to Hakscan to see your scan history and findings.",
  alternates: { canonical: "/login" },
  // Nothing here is worth ranking for, and it's excluded from the
  // sitemap (see sitemap.ts) — noindex keeps that consistent instead of
  // leaving Google to guess.
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Log in to see your scan history and findings.">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
