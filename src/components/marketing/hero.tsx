"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScanVisual } from "@/components/three/scan-visual";
import { ArrowRight } from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { TypedText } from "@/components/typed-text";
import { CyberGlitchText } from "@/components/ui/cyber-glitch-text";
import { BorderBeam } from "@/components/ui/border-beam";

export function MarketingHero() {
  return (
    <section className="console-grid relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10%] size-[900px] -translate-x-1/2 opacity-40">
          <ScanVisual className="size-full" />
        </div>
      </div>

      <div className="mx-auto flex max-w-4xl flex-col items-center px-6 pb-28 pt-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-md border border-border bg-card/60 px-3 py-1 font-heading text-xs tracking-wide text-muted-foreground"
        >
          <span className="size-1.5 rounded-full bg-primary shadow-[0_0_6px] shadow-primary animate-pulse" />
          [ RECON: FOUNDERS SHIPPING WITH CLAUDE &amp; GPT ]
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="text-balance font-heading text-4xl font-medium tracking-tight md:text-6xl"
        >
          You shipped fast.
          <br />
          <span className="text-primary">
            Now find out what got <CyberGlitchText text="skipped." scrambleDuration={30} />
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="mt-6 max-w-xl text-balance text-lg text-muted-foreground"
        >
          Scan your repo or live site, get a prioritized report explained in
          plain language, with the exact fix, not just the jargon.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18 }}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Button size="lg" render={<Link href="/signup" />}>
            Scan your project free
            <ArrowRight className="size-4" />
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/signup" />}>
            <GithubIcon className="size-4" />
            Continue with GitHub
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="relative mt-8 overflow-hidden rounded-md border border-border/60 bg-card/40 px-4 py-2"
        >
          <BorderBeam size={120} duration={6} colorFrom="var(--color-primary)" colorTo="transparent" />
          <p className="font-mono text-xs text-muted-foreground/70">
            <BootLine text="$ initializing recon on your target..." />
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function BootLine({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-px">
      <TypedText text={text} />
      <span className="h-3.5 w-[7px] animate-pulse bg-primary/80" />
    </span>
  );
}
