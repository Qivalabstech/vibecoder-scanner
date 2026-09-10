import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Log in to see your scan history and findings.">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
