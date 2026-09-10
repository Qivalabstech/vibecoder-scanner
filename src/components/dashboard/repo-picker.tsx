"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/icons/github-icon";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Repo {
  fullName: string;
  private: boolean;
  htmlUrl: string;
}

export function RepoPicker() {
  const router = useRouter();
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [attested, setAttested] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/github/repos")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.message ?? json.error);
        setRepos(json.repos);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function handleAdd() {
    if (!selected || !attested) return;
    setSubmitting(true);
    const res = await fetch("/api/targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "repo", fullName: selected, authorizationAttested: true }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      toast.error(json.message ?? "Couldn't add repo");
      return;
    }
    toast.success("Repo verified and added");
    router.push("/targets");
    router.refresh();
  }

  if (error === "no_github_connection") {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Connect GitHub to list repos you administer.{" "}
        <a href="/login" className="underline underline-offset-4">
          Continue with GitHub
        </a>
      </div>
    );
  }
  if (error) {
    return <p className="text-sm text-destructive">Couldn&apos;t load repos: {error}</p>;
  }
  if (!repos) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading repos with admin or write access…
      </div>
    );
  }
  if (repos.length === 0) {
    return (
      <p className="py-6 text-sm text-muted-foreground">
        No repos found where you have admin or write access.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
        {repos.map((repo) => (
          <button
            key={repo.fullName}
            type="button"
            onClick={() => setSelected(repo.fullName)}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
              selected === repo.fullName ? "bg-accent" : "hover:bg-accent/50"
            }`}
          >
            <GithubIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{repo.fullName}</span>
            {repo.private ? (
              <Lock className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <Globe2 className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
            )}
          </button>
        ))}
      </div>

      <div className="flex items-start gap-2">
        <Checkbox id="attest" checked={attested} onCheckedChange={(v) => setAttested(v === true)} />
        <Label htmlFor="attest" className="text-sm font-normal text-muted-foreground">
          I own this repository or am authorized to have it scanned for security vulnerabilities.
        </Label>
      </div>

      <Button className="w-full" disabled={!selected || !attested || submitting} onClick={handleAdd}>
        {submitting && <Loader2 className="size-4 animate-spin" />}
        Add repo
      </Button>
    </div>
  );
}
