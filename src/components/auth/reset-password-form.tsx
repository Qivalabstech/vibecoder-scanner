"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import styles from "./auth-shell.module.css";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // null = still checking, false = no valid recovery session, true = ready.
  // This page is only reachable with a real session after auth/callback
  // exchanged the recovery link's code — landing here directly (an old
  // link, a guess, a bookmark) must not show a working form with
  // nothing behind it.
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    router.push("/dashboard");
    router.refresh();
  }

  if (ready === null) {
    return null;
  }

  if (!ready) {
    return (
      <div className={styles.confirmCard}>
        <p className={styles.confirmTitle}>This link isn&apos;t valid</p>
        <p className={styles.confirmBody}>
          It may have expired or already been used.{" "}
          <Link href="/forgot-password">Request a new one</Link>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div>
        <label htmlFor="password" className={styles.label}>
          New password
        </label>
        <div className={styles.inputWrap} style={{ marginTop: 6 }}>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className={`${styles.input} ${styles.inputWithToggle}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className={styles.passwordToggle}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      <button type="submit" className={styles.submitBtn} disabled={loading}>
        {loading && <Loader2 size={16} className="animate-spin" />}
        Set new password
      </button>
    </form>
  );
}
