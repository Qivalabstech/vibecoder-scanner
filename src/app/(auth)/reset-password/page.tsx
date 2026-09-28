import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Set a new password, Hakscan",
  description: "Set a new password for your Hakscan account.",
  alternates: { canonical: "/reset-password" },
  robots: { index: false },
};

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Set a new password" subtitle="Choose a new password for your account.">
      <ResetPasswordForm />
    </AuthShell>
  );
}
