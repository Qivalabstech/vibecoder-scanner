import Link from "next/link";
import Script from "next/script";
import { createPublicClient } from "@/lib/supabase/public";
import { LandingMobileNav } from "@/components/landing/mobile-nav";
import { HeroScanCta } from "@/components/landing/hero-scan-cta";
import { HakscanMark } from "@/components/brand/mark";
import styles from "./landing.module.css";

// No page-local font here — the brand guidelines specify JetBrains Mono
// only ("never use a second typeface for body copy"), and that's already
// self-hosted site-wide via next/font/local in layout.tsx as --font-jbm,
// which cascades down as a plain CSS custom property. landing.module.css
// just points its own --font-* tokens at var(--font-jbm) instead of
// loading a second face.
const META_PIXEL_ID = "1359487770578149";

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#what-we-scan", label: "What we scan" },
  { href: "#pricing", label: "Pricing" },
];

const SCAN_TYPES = [
  {
    icon: "🔑",
    label: "Exposed secrets",
    desc: "API keys, tokens, and credentials committed to source code or visible in network responses.",
    severity: "critical" as const,
  },
  {
    icon: "🚪",
    label: "Open admin routes",
    desc: "Unprotected admin panels, dashboards, and internal endpoints accessible without authentication.",
    severity: "high" as const,
  },
  {
    icon: "📄",
    label: "Leaked config files",
    desc: ".env files, database configs, and deployment secrets exposed on the live server.",
    severity: "critical" as const,
  },
  {
    icon: "💉",
    label: "Injection vectors",
    desc: "SQL injection, command injection, and XSS paths introduced by AI-generated query code.",
    severity: "high" as const,
  },
  {
    icon: "🔒",
    label: "Missing auth checks",
    desc: "Endpoints that accept requests without validating session tokens or user permissions.",
    severity: "high" as const,
  },
  {
    icon: "📦",
    label: "Vulnerable dependencies",
    desc: "Third-party packages with known CVEs pulled in via npm, pip, or other package managers.",
    severity: "medium" as const,
  },
];

const STEPS = [
  {
    num: "01",
    title: "Connect your repo or URL",
    desc: "Paste a GitHub repository link or your live site URL. No setup, no configuration, no CI pipeline required.",
  },
  {
    num: "02",
    title: "We verify ownership",
    desc: "Add a small DNS record or a file to your repo. Takes under a minute. Prevents anyone from scanning sites they don't own.",
  },
  {
    num: "03",
    title: "Scan runs in isolation",
    desc: "Semgrep, Gitleaks, and OWASP ZAP run in a sandboxed environment. Your code never touches our main infrastructure.",
  },
  {
    num: "04",
    title: "Get a plain-English report",
    desc: "AI reads the raw findings and explains what's wrong, how serious it is, and the exact lines to change — no security background needed.",
  },
];

const FINDINGS = [
  {
    id: "HAK-001",
    severity: "CRITICAL" as const,
    title: "Stripe secret key exposed in source",
    file: "src/lib/stripe.ts:14",
    desc: "STRIPE_SECRET_KEY is hardcoded and committed. Anyone with repo access can make charges on your account.",
    fix: "Move to .env and add to .gitignore. Rotate the key immediately at dashboard.stripe.com/apikeys.",
  },
  {
    id: "HAK-002",
    severity: "HIGH" as const,
    title: "Unauthenticated /admin/users endpoint",
    file: "src/pages/api/admin/users.ts:1",
    desc: "This route returns all user emails and roles without checking if the requester is an admin.",
    fix: 'Add a middleware check: if (!session?.user?.role === "admin") return res.status(403).json({ error: "Forbidden" })',
  },
  {
    id: "HAK-003",
    severity: "MEDIUM" as const,
    title: "next-auth 4.22.1 has known session fixation vulnerability",
    file: "package.json:18",
    desc: "CVE-2023-48309 allows session fixation under certain OAuth flows.",
    fix: "Run: npm install next-auth@latest — fixed in 4.24.5.",
  },
];

// Brand severity hues (Hakscan-Brand-Guidelines.html §02 — Crit/High/Med),
// tinted to a low-opacity wash over the ink background rather than the
// old fixed dark hexes, which were tuned for the Figma export's
// different (non-brand) severity hues and would clash now.
const SEVERITY_COLOR: Record<(typeof FINDINGS)[number]["severity"], string> = {
  CRITICAL: "var(--color-critical)",
  HIGH: "var(--color-high)",
  MEDIUM: "var(--color-medium)",
};
const SEVERITY_BG: Record<(typeof FINDINGS)[number]["severity"], string> = {
  CRITICAL: "rgba(244, 63, 94, 0.14)",
  HIGH: "rgba(251, 146, 60, 0.14)",
  MEDIUM: "rgba(251, 191, 36, 0.14)",
};
const SCAN_TYPE_COLOR: Record<(typeof SCAN_TYPES)[number]["severity"], { color: string; background: string }> = {
  critical: { color: "var(--color-critical)", background: "rgba(244, 63, 94, 0.14)" },
  high: { color: "var(--color-high)", background: "rgba(251, 146, 60, 0.14)" },
  medium: { color: "var(--color-medium)", background: "rgba(251, 191, 36, 0.14)" },
};

export default async function Home() {
  const supabase = createPublicClient();
  const { data: pricing } = await supabase.from("pricing_config").select("pro_price_usd").eq("id", 1).single();
  const proPriceUsd = pricing?.pro_price_usd ?? 24;

  return (
    <div className={styles.landing}>
      {/* Meta Pixel — afterInteractive keeps it off the critical path,
          same pattern as the GA tag in layout.tsx. connect.facebook.net /
          www.facebook.com are allow-listed in next.config.ts's CSP;
          script-src's existing 'unsafe-inline' already covers this
          inline init call. */}
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element -- Meta's own tracking pixel snippet, not a real content image */}
        <img
          height={1}
          width={1}
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>

      <nav className={styles.nav}>
        <Link href="#top" className={styles.brand} aria-label="Hakscan home">
          <HakscanMark size={28} />
          <span className={styles.brandName}>
            hak<span className={styles.brandAccent}>scan</span>
          </span>
        </Link>

        <div className={styles.navLinks}>
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </div>

        <div className={styles.navActions}>
          <Link href="/login" className={styles.navLoginLink}>
            Log in
          </Link>
          <Link href="/signup" className={styles.navCta}>
            Scan free
          </Link>
        </div>

        <LandingMobileNav />
      </nav>

      <section id="top" className={styles.hero}>
        <div className={styles.heroGrid} />
        <div className={styles.heroInner}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            First scan is free — no credit card
          </div>

          <h1 className={styles.h1}>
            Is your app
            <br />
            <span>actually secure?</span>
          </h1>

          <p className={styles.sub}>
            You shipped with Claude, Cursor, or GPT. Now find out what got skipped — exposed keys, open admin routes,
            leaked .env files — before your users or investors do.
          </p>

          <HeroScanCta />

          <p className={styles.scanNote}>Results in 2–4 minutes · Ownership verified before scan</p>

          <div className={styles.trustRow}>
            {["Semgrep", "Gitleaks", "OWASP ZAP"].map((tool) => (
              <span key={tool} className={styles.trustTool}>
                {tool}
              </span>
            ))}
            <span className={styles.trustNote}>Runs in an isolated sandbox</span>
          </div>
        </div>
      </section>

      <section className={styles.reportSection}>
        <div className={styles.reportCard}>
          <div className={styles.reportBar}>
            {/* Classic terminal-window traffic lights, redrawn in the brand's
                own severity/accent hues instead of arbitrary red/yellow/green —
                the guidelines have no dedicated "success green", so teal
                stands in for it. */}
            <span className={styles.reportDot} style={{ background: "var(--color-critical)" }} />
            <span className={styles.reportDot} style={{ background: "var(--color-medium)" }} />
            <span className={styles.reportDot} style={{ background: "var(--color-accent)" }} />
            <span className={styles.reportBarLabel}>hakscan — scan report · github.com/acme/saas-app · 14 Sep 2026</span>
          </div>

          <div className={styles.reportSummary}>
            {[
              { label: "Critical", count: 2, color: "var(--color-critical)" },
              { label: "High", count: 3, color: "var(--color-high)" },
              { label: "Medium", count: 5, color: "var(--color-medium)" },
              { label: "Files scanned", count: 284, color: "var(--color-muted)" },
            ].map(({ label, count, color }) => (
              <div key={label} className={styles.reportStat}>
                <span className={styles.reportStatNum} style={{ color }}>
                  {count}
                </span>
                <span className={styles.reportStatLabel}>{label}</span>
              </div>
            ))}
          </div>

          <div>
            {FINDINGS.map((f) => (
              <div key={f.id} className={styles.findingRow}>
                <div className={styles.findingMeta}>
                  <span
                    className={styles.severityTag}
                    style={{ color: SEVERITY_COLOR[f.severity], background: SEVERITY_BG[f.severity], borderColor: SEVERITY_BG[f.severity] }}
                  >
                    {f.severity}
                  </span>
                  <span className={styles.findingId}>{f.id}</span>
                </div>
                <div>
                  <p className={styles.findingTitle}>{f.title}</p>
                  <p className={styles.findingFile}>{f.file}</p>
                  <p className={styles.findingDesc}>{f.desc}</p>
                  <div className={styles.fixBox}>
                    <span className={styles.fixLabel}>fix → </span>
                    {f.fix}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className={styles.reportCaption}>Example output — your actual report will reflect your codebase</p>
      </section>

      <section id="how-it-works" className={styles.section}>
        <div className={styles.sectionHead}>
          <p className={styles.sectionEyebrow}>HOW IT WORKS</p>
          <h2 className={styles.sectionTitle}>
            From repo to report
            <br />
            in minutes
          </h2>
        </div>

        <div className={styles.stepsGrid}>
          {STEPS.map((step) => (
            <div key={step.num} className={styles.stepCard}>
              <div className={styles.stepNum}>{step.num}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="what-we-scan" className={styles.section}>
        <div className={styles.sectionHead}>
          <p className={styles.sectionEyebrow}>WHAT WE SCAN</p>
          <h2 className={styles.sectionTitle}>
            What AI tools tend
            <br />
            to skip
          </h2>
        </div>

        <div className={styles.scanTypesGrid}>
          {SCAN_TYPES.map((item) => (
            <div key={item.label} className={styles.scanTypeCard}>
              <div className={styles.scanTypeIcon}>{item.icon}</div>
              <div className={styles.scanTypeHead}>
                <h3>{item.label}</h3>
                <span className={styles.scanTypeSeverity} style={SCAN_TYPE_COLOR[item.severity]}>
                  {item.severity}
                </span>
              </div>
              <p className={styles.scanTypeDesc}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className={styles.section}>
        <div className={styles.sectionHead}>
          <p className={styles.sectionEyebrow}>PRICING</p>
          <h2 className={styles.sectionTitle}>Simple, honest pricing</h2>
        </div>

        <div className={styles.pricesGrid}>
          <div className={styles.priceCard}>
            <h3 className={styles.planName}>Free</h3>
            <div className={styles.planAmount}>$0</div>
            <ul className={styles.planFeatures}>
              {["1 repo or URL scan", "Full vulnerability report", "Plain-English fix suggestions", "No credit card required"].map(
                (f) => (
                  <li key={f}>
                    <span className={styles.planCheck}>✓</span>
                    {f}
                  </li>
                )
              )}
            </ul>
            <Link href="/signup" className={`${styles.planCta} ${styles.planCtaLine}`}>
              Scan for free
            </Link>
          </div>

          <div className={`${styles.priceCard} ${styles.pricePro}`}>
            <span className={styles.popularTag}>POPULAR</span>
            <h3 className={styles.planName}>Pro</h3>
            <div className={styles.planAmount}>
              ${proPriceUsd}
              <small>/month</small>
            </div>
            <ul className={styles.planFeatures}>
              {[
                "Unlimited scans",
                "Scheduled rescans (daily / weekly)",
                "Slack & email alerts on new findings",
                "Historical diff — see what changed",
                "Priority support",
              ].map((f) => (
                <li key={f}>
                  <span className={styles.planCheck}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/signup" className={`${styles.planCta} ${styles.planCtaSolid}`}>
              Start with free scan →
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.ctaBanner}>
          <div className={styles.ctaGlow} />
          <div className={styles.ctaContent}>
            <h2>
              Your app is live.
              <br />
              Is it safe?
            </h2>
            <p>
              AI-built apps get audited when they get funded, acquired, or breached. Know your exposure before someone
              else finds it first.
            </p>
            <Link href="/signup" className={`${styles.planCta} ${styles.planCtaSolid}`} style={{ display: "inline-block" }}>
              Run a free scan
            </Link>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={`${styles.footInner}`} style={{ paddingBottom: 24, borderBottom: "1px solid var(--color-border-subtle)" }}>
          <div className={styles.badgesRow}>
            <a href="https://www.betterlaunch.co/product/hakscan" target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- external launch-platform badge, not app content */}
              <img
                src="https://www.betterlaunch.co/badge-launching-light.svg"
                alt="Launching on Better Launch"
                width={180}
                height={50}
                loading="lazy"
                fetchPriority="low"
              />
            </a>
            <a
              href="https://www.producthunt.com/products/hakscan-ai?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-hakscan-ai"
              target="_blank"
              rel="noopener noreferrer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- external launch-platform badge, not app content */}
              <img
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1250664&theme=dark&t=1790337942006"
                alt="Hakscan Ai - Your AI wrote the code. We check it. | Product Hunt"
                width={220}
                height={48}
                loading="lazy"
                fetchPriority="low"
              />
            </a>
          </div>
        </div>
        <div className={styles.footInner}>
          <div className={styles.footBrand}>
            <HakscanMark size={24} />
            <span>
              hak<span className={styles.brandAccent}>scan</span>
            </span>
          </div>

          <p className={styles.footCopy}>© 2026 Hakscan. Scans run in isolated sandboxes. We never store your source code.</p>

          <div className={styles.footLinks}>
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/terms">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
