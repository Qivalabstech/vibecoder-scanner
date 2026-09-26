"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import styles from "./auth-shell.module.css";

export function GithubButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // read:user/user:email for identity, repo for the ownership-verification
        // gate (Phase 2) to list repos the user actually administers
        scopes: "read:user user:email repo",
      },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
  }

  return (
    <button type="button" className={styles.oauthBtn} onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 size={16} className="animate-spin" /> : <GithubIcon className="size-4" />}
      {label}
    </button>
  );
}
