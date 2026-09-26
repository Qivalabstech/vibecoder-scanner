"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Eye, EyeOff, MailCheck } from "lucide-react";
import { GithubButton } from "@/components/auth/github-button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import styles from "./auth-shell.module.css";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    // If email confirmation is disabled (common in local/dev, sometimes prod),
    // signUp already returns an active session — there's no email to "check."
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className={styles.confirmCard}>
        <MailCheck size={28} strokeWidth={1.5} className={styles.confirmIcon} />
        <p className={styles.confirmTitle}>Check your inbox</p>
        <p className={styles.confirmBody}>We sent a confirmation link to {email}.</p>
      </div>
    );
  }

  return (
    <div>
      <GithubButton label="Sign up with GitHub" />

      <div className={styles.divider}>
        <span className={styles.dividerLine} />
        <span className={styles.dividerText}>or</span>
        <span className={styles.dividerLine} />
      </div>

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
        <div>
          <label htmlFor="password" className={styles.label}>
            Password
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
          Create account
        </button>
      </form>

      <p className={styles.switchLine}>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>

      <p className={styles.agreeLine}>
        By continuing you agree to our <Link href="/legal/terms">Terms</Link>, including the scan-authorization
        requirement, and our <Link href="/legal/privacy">Privacy Policy</Link>.
      </p>
    </div>
  );
}
