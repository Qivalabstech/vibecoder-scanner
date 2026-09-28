import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password, Hakscan",
  description: "Request a password reset link for your Hakscan account.",
  alternates: { canonical: "/forgot-password" },
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we'll send you a reset link.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
