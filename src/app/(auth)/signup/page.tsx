import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Sign up free, Hakscan",
  description: "Create a free Hakscan account and scan your first GitHub repo or live site for security flaws.",
  alternates: { canonical: "/signup" },
};

// Same rule as /auth/callback's safeNextPath: same-origin relative paths
// only, so a crafted ?next= can't become an open redirect.
function safeNext(value: string | string[] | undefined): string {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.includes("://")) return "/dashboard";
  return v;
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const next = safeNext((await searchParams).next);
  return (
    <AuthShell title="Create your account" subtitle="Free forever for one verified target.">
      <SignupForm next={next} />
    </AuthShell>
  );
}
