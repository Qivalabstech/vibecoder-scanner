"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import styles from "./auth-shell.module.css";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    // Supabase returns success here even for an email that isn't
    // registered — that's deliberate on its end (don't let this become
    // an account-enumeration oracle), so the UI always shows the same
    // "check your inbox" state regardless. A real error (rate limit,
    // service outage) still surfaces.
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className={styles.confirmCard}>
        <MailCheck size={28} strokeWidth={1.5} className={styles.confirmIcon} />
        <p className={styles.confirmTitle}>Check your inbox</p>
        <p className={styles.confirmBody}>
          If an account exists for {email}, we sent a link to reset the password.
        </p>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div>
          <label htmlFor="email" className={styles.label}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={styles.input}
            style={{ marginTop: 6 }}
          />
        </div>
        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          Send reset link
        </button>
      </form>

      <p className={styles.switchLine}>
        Remembered it? <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}
