import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Sign up free, Hakscan",
  description: "Create a free Hakscan account and scan your first GitHub repo or live site for security flaws.",
  alternates: { canonical: "/signup" },
};

export default function SignupPage() {
  return (
    <AuthShell title="Create your account" subtitle="Free forever for one verified target.">
      <SignupForm />
    </AuthShell>
  );
}
