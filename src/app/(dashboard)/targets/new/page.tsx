"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { RepoPicker } from "@/components/dashboard/repo-picker";
import { SiteVerifier } from "@/components/dashboard/site-verifier";
import { Globe } from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";

export default function NewTargetPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add a target</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          No scan runs until ownership is verified: for repos, that&apos;s enforced through your GitHub
          permissions; for sites, through a DNS or meta-tag challenge.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="repo">
            <TabsList className="mb-6 w-full">
              <TabsTrigger value="repo" className="gap-1.5">
                <GithubIcon className="size-4" />
                GitHub repo
              </TabsTrigger>
              <TabsTrigger value="site" className="gap-1.5">
                <Globe className="size-4" />
                Live site
              </TabsTrigger>
            </TabsList>
            <TabsContent value="repo">
              <RepoPicker />
            </TabsContent>
            <TabsContent value="site">
              <SiteVerifier />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
