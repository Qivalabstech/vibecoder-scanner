"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/icons/github-icon";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

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
    <Button variant="outline" className="w-full" onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : <GithubIcon className="size-4" />}
      {label}
    </Button>
  );
}
