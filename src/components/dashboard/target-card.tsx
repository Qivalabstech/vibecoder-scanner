"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Globe, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { GithubIcon } from "@/components/icons/github-icon";
import { Badge } from "@/components/ui/badge";
import { TriggerScanButton } from "@/components/dashboard/trigger-scan-button";

export interface TargetRow {
  id: string;
  type: "repo" | "site";
  identifier: string;
  verified: boolean;
  verification_token: string | null;
}

export function TargetCard({ target }: { target: TargetRow }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-accent">
            {target.type === "repo" ? (
              <GithubIcon className="size-5 text-accent-foreground" />
            ) : (
              <Globe className="size-5 text-accent-foreground" />
            )}
          </div>
          <Link href={`/targets/${target.id}`} className="min-w-0 flex-1">
            <p className="truncate font-medium hover:underline">{target.identifier}</p>
            <div className="mt-1 flex items-center gap-2">
              {target.verified ? (
                <Badge variant="secondary" className="gap-1 text-severity-low">
                  <ShieldCheck className="size-3" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="text-severity-medium">
                  Pending verification
                </Badge>
              )}
            </div>
          </Link>
          <TriggerScanButton targetId={target.id} verified={target.verified} />
        </CardContent>
      </Card>
    </motion.div>
  );
}
