"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

interface PendingTarget {
  id: string;
  identifier: string;
  verification_token: string;
}

export function SiteVerifier() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [attested, setAttested] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState<PendingTarget | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "site", url, authorizationAttested: true }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      toast.error(json.message ?? "Couldn't add site");
      return;
    }
    setPending(json.target);
  }

  async function handleVerify() {
    if (!pending) return;
    setChecking(true);
    const res = await fetch(`/api/targets/${pending.id}/verify`, { method: "POST" });
    const json = await res.json();
    setChecking(false);
    if (!res.ok) {
      toast.error(json.message ?? "Verification failed");
      return;
    }
    if (json.verified) {
      toast.success("Site verified");
      router.push("/targets");
      router.refresh();
      return;
    }
    toast.info(json.message ?? "Not found yet. DNS/meta-tag changes can take a few minutes.");
  }

  if (pending) {
    const host = new URL(pending.identifier).hostname;
    return (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Add <strong className="text-foreground">one</strong> of the following to{" "}
          <strong className="text-foreground">{pending.identifier}</strong>, then verify.
        </p>

        <Tabs defaultValue="dns">
          <TabsList>
            <TabsTrigger value="dns">DNS TXT record</TabsTrigger>
            <TabsTrigger value="meta">Meta tag</TabsTrigger>
          </TabsList>
          <TabsContent value="dns" className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Add a TXT record at <code className="rounded bg-muted px-1">_vibecoder-challenge.{host}</code>
            </p>
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">{pending.verification_token}</pre>
          </TabsContent>
          <TabsContent value="meta" className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Add this to your site&apos;s <code className="rounded bg-muted px-1">&lt;head&gt;</code>
            </p>
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">{`<meta name="vibecoder-site-verification" content="${pending.verification_token}" />`}</pre>
          </TabsContent>
        </Tabs>

        <Button className="w-full" onClick={handleVerify} disabled={checking}>
          {checking ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
          I&apos;ve added it, verify now
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleCreate} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="url">Site URL</Label>
        <Input
          id="url"
          required
          placeholder="https://yourapp.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>

      <div className="flex items-start gap-2">
        <Checkbox id="attest-site" checked={attested} onCheckedChange={(v) => setAttested(v === true)} />
        <Label htmlFor="attest-site" className="text-sm font-normal text-muted-foreground">
          I own this site or am authorized to have it scanned for security vulnerabilities.
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={!attested || submitting}>
        {submitting && <Loader2 className="size-4 animate-spin" />}
        Continue to verification
      </Button>
    </form>
  );
}
