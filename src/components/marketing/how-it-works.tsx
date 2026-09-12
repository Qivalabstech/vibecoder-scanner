import { KeyRound, ScanSearch, FileText } from "lucide-react";
import { CyberGlitchText } from "@/components/ui/cyber-glitch-text";
import { BorderBeam } from "@/components/ui/border-beam";

const steps = [
  {
    icon: KeyRound,
    title: "Prove it's yours",
    description:
      "Connect via GitHub OAuth or verify a live site with a DNS record or meta tag. Nothing scans until ownership is confirmed.",
  },
  {
    icon: ScanSearch,
    title: "We scan, sandboxed",
    description:
      "Semgrep and Gitleaks comb your repo; a passive OWASP ZAP baseline checks your live site. No active exploitation, ever.",
  },
  {
    icon: FileText,
    title: "Claude explains it",
    description:
      "Raw findings get triaged, deduplicated, and rewritten in plain language, with the business impact and the actual fix.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-5xl px-6 py-24">
      <h2 className="max-w-md text-3xl font-semibold tracking-tight">
        Three steps between &ldquo;I hope this is secure&rdquo; and{" "}
        <CyberGlitchText text="knowing." scrambleDuration={30} />
      </h2>
      <div className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
        <div
          className="absolute top-5 right-0 left-0 hidden h-px bg-border md:block"
          aria-hidden
        />
        {steps.map((step, i) => (
          <div key={step.title} className="relative">
            <div className="relative z-10 flex size-10 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
              <BorderBeam size={30} duration={8} delay={i * 2} colorFrom="var(--color-primary)" colorTo="transparent" />
              <step.icon className="size-4.5 text-primary" strokeWidth={1.75} />
            </div>
            <p className="mt-4 font-medium">
              <span className="text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>{" "}
              {step.title}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
