import Link from "next/link";
import Script from "next/script";
import { Newsreader } from "next/font/google";
import { createPublicClient } from "@/lib/supabase/public";
import { LandingMobileNav } from "@/components/landing/mobile-nav";
import styles from "./landing.module.css";

// This page's own serif body face — the rest of the app only loads
// JetBrains Mono (next/font/local in layout.tsx, reused here via
// --font-jbm), so Newsreader is scoped to just this page's font
// variable rather than added to the shared layout.
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-newsreader",
  display: "swap",
});

const META_PIXEL_ID = "2150486143013973";

export default async function Home() {
  const supabase = createPublicClient();
  const { data: pricing } = await supabase.from("pricing_config").select("pro_price_usd").eq("id", 1).single();
  const proPriceUsd = pricing?.pro_price_usd ?? 24;

  return (
    <div className={`${styles.landing} ${newsreader.variable}`}>
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

      <header className={styles.header}>
        <nav className={styles.nav}>
          <Link className={styles.brand} href="#top" aria-label="Hakscan home">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <g fill="none" stroke="var(--teal)" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round">
                <path d="M 18 42 L 18 18 L 42 18" />
                <path d="M 82 58 L 82 82 L 58 82" />
              </g>
              <line x1={29} y1={71} x2={63} y2={37} stroke="var(--teal)" strokeWidth={5} strokeLinecap="round" />
              <circle cx={70} cy={30} r={7} fill="var(--flag)" />
            </svg>
            <b>
              hak<span>scan</span>
            </b>
          </Link>
          <div className={styles.navlinks}>
            <a href="#how">How it works</a>
            <a href="#scans">What we check</a>
            <a href="#limits">What we don&apos;t do</a>
            <a href="#pricing">Pricing</a>
          </div>
          <Link className={`${styles.btn} ${styles.btnSolid} ${styles.navCta}`} href="/signup">
            Scan my project
          </Link>
          <LandingMobileNav />
        </nav>
      </header>

      <main id="top">
        <div className={styles.wrap}>
          <div className={styles.hero}>
            <p className={styles.kicker}>For people who build with Cursor, Claude and GPT</p>
            <h1 className={styles.h1}>Find out what&apos;s wrong with the app you just shipped.</h1>
            <p className={styles.sub}>
              Hakscan checks your code and your live site for security problems, then explains each one in words you
              already understand, with the fix written out. You don&apos;t need a security background to use it.
            </p>
            <div className={styles.ctaRow}>
              <Link className={`${styles.btn} ${styles.btnSolid}`} href="/signup">
                Scan one project free
              </Link>
              <a className={`${styles.btn} ${styles.btnLine}`} href="#how">
                See how it works
              </a>
              <span className={styles.ctaNote}>No card. Takes about two minutes.</span>
            </div>
          </div>
        </div>

        <div className={styles.wrap}>
          <div className={styles.demo}>
            <div className={styles.demoHead}>
              <p>
                <span className={styles.dot} />A real finding, before and after
              </p>
              <span className={styles.sev}>Medium</span>
            </div>
            <div className={styles.panes}>
              <div className={styles.pane}>
                <p className={styles.paneTag}>What a normal scanner hands you</p>
                <p className={styles.raw}>
                  <i>CWE-22</i>
                  {`: Improper Limitation of a
Pathname to a Restricted Directory
  rule.id  javascript.lang.security.
           audit.path-traversal
  loc      handlers/upload.ts:41:18
  sink     fs.createReadStream(p)
  conf     HIGH`}
                </p>
              </div>
              <div className={`${styles.pane} ${styles.plain}`}>
                <p className={styles.paneTag}>What Hakscan hands you</p>
                <h4>Someone can open files on your server that you never meant to share.</h4>
                <p>
                  Your upload handler trusts the filename it&apos;s given. If a visitor sends a filename with{" "}
                  <span className={styles.mono}>../</span> in it, they can walk out of your uploads folder and read
                  other files, including your config.
                </p>
                <div className={styles.fixbox}>
                  {`const safe = path.resolve(UPLOAD_DIR, name);
if (!safe.startsWith(UPLOAD_DIR)) throw new Error('bad path');`}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.wrap}>
          <section id="how" className={`${styles.section} ${styles.anchorTarget}`}>
            <h2 className={styles.secTitle}>Four steps, start to finished report</h2>
            <p className={styles.secLead}>
              Most people get through this the first time without reading any documentation. Here is the whole
              thing.
            </p>
            <div className={styles.steps}>
              <div className={styles.step}>
                <div className={styles.stepN}>Step 1</div>
                <div>
                  <h3>Point us at your project</h3>
                  <p>
                    Connect a GitHub repository, paste the URL of a site you run, or both. If you built it and
                    it&apos;s live, it can be scanned.
                  </p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepN}>Step 2</div>
                <div>
                  <h3>Prove it&apos;s yours</h3>
                  <p>
                    For a repository, we check you have admin access on GitHub. For a website, you add a DNS record
                    or a meta tag we give you. Nothing gets scanned until this passes, and we check it every time,
                    not just once.
                  </p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepN}>Step 3</div>
                <div>
                  <h3>We run the scan</h3>
                  <p>
                    Your code runs through real, well-known security tools inside a sealed container that has no
                    access to the internet or to anyone else&apos;s data. When the scan finishes, the container is
                    destroyed along with your code.
                  </p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepN}>Step 4</div>
                <div>
                  <h3>You get findings you can act on</h3>
                  <p>
                    We drop the duplicates and the false alarms, sort what&apos;s left by how much it actually
                    matters, and rewrite each one in plain English with the fix. Raw technical detail is still there
                    behind a toggle if you want it.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className={styles.wrap}>
          <section id="scans" className={`${styles.section} ${styles.anchorTarget}`}>
            <h2 className={styles.secTitle}>What we actually check</h2>
            <p className={styles.secLead}>
              Two kinds of target, four established open-source tools underneath. Nothing invented, nothing
              proprietary hiding the work.
            </p>
            <div className={styles.grid2}>
              <div className={styles.card}>
                <h3>Your code repository</h3>
                <p className={styles.cardTools}>Semgrep&nbsp;+&nbsp;Gitleaks</p>
                <p>We read your source the way a reviewer would, looking for patterns that let an attacker in.</p>
                <ul>
                  <li>Injection flaws, unsafe file handling, missing input checks</li>
                  <li>API keys, tokens and passwords committed by accident</li>
                  <li>Authentication and permission gaps in your routes</li>
                  <li>Dangerous defaults left switched on</li>
                </ul>
              </div>
              <div className={styles.card}>
                <h3>Your live website</h3>
                <p className={styles.cardTools}>OWASP ZAP&nbsp;·&nbsp;passive mode only</p>
                <p>We look at what your running site tells the outside world, without touching or stressing it.</p>
                <ul>
                  <li>Missing security headers browsers rely on</li>
                  <li>Cookie and session settings that leak</li>
                  <li>Server details exposed to anyone who asks</li>
                  <li>Transport and certificate problems</li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        <div className={styles.wrap}>
          <section id="limits" className={`${styles.section} ${styles.anchorTarget}`}>
            <div className={styles.limits}>
              <h2>What Hakscan will not do</h2>
              <p>Worth knowing before you sign up, not buried in the terms page.</p>
              <div className={styles.limitRow}>
                <div>
                  <h4>Not a penetration test</h4>
                  <p>
                    We never attack, exploit or try to break your site. The live-site scan is strictly passive: it
                    reads what your server already gives out. If you need someone actively trying to break in, you
                    need a pentest, and that&apos;s a different thing.
                  </p>
                </div>
                <div>
                  <h4>Not for other people&apos;s projects</h4>
                  <p>
                    You can only scan things you can prove you own. This is enforced on our servers, not just hidden
                    in the interface. It&apos;s a legal line, and we hold it.
                  </p>
                </div>
                <div>
                  <h4>Not a team product yet</h4>
                  <p>
                    One account, one person, for now. No shared workspaces, no inviting colleagues, no shared
                    targets. If you need that today, we&apos;re not the right fit yet.
                  </p>
                </div>
                <div>
                  <h4>Not a guarantee</h4>
                  <p>
                    No scanner catches everything, and anyone claiming otherwise is selling you something. We find
                    what these tools can find, explain it honestly, and tell you when we&apos;re unsure.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className={styles.wrap}>
          <section id="pricing" className={`${styles.section} ${styles.anchorTarget}`}>
            <h2 className={styles.secTitle}>Pricing</h2>
            <p className={styles.secLead}>
              Start free, stay free if one project is all you have. No demo call, no quote, no annual commitment to
              begin.
            </p>
            <div className={styles.prices}>
              <div className={styles.price}>
                <p className={styles.name}>Free</p>
                <p className={styles.amount}>$0</p>
                <p>Enough to find out whether the thing you shipped has a problem.</p>
                <ul>
                  <li>One project, scanned whenever you want</li>
                  <li>Full findings with plain-English explanations</li>
                  <li>Downloadable PDF report</li>
                  <li>Email alert when a scan finishes</li>
                </ul>
                <Link className={`${styles.btn} ${styles.btnLine}`} href="/signup">
                  Start free
                </Link>
              </div>
              <div className={`${styles.price} ${styles.pricePro}`}>
                <p className={styles.name}>Pro</p>
                <p className={styles.amount}>
                  ${proPriceUsd} <small>/ month</small>
                </p>
                <p>For when you&apos;re running more than one thing and shipping often.</p>
                <ul>
                  <li>Unlimited projects and sites</li>
                  <li>Automatic weekly or monthly re-scans</li>
                  <li>Your scans skip the queue</li>
                  <li>Everything in Free</li>
                </ul>
                <Link className={`${styles.btn} ${styles.btnSolid}`} href="/signup">
                  Go Pro
                </Link>
              </div>
            </div>
          </section>
        </div>

        <div className={styles.wrap}>
          <div className={`${styles.close} ${styles.anchorTarget}`} id="start">
            <h2>We scanned ourselves before asking you to trust us.</h2>
            <p>
              Hakscan found three problems in its own code and site. Two were fixed the same day, and the third
              turned out to be a false alarm the tool caught on its own.
            </p>
            <div className={styles.ctaRow}>
              <Link className={`${styles.btn} ${styles.btnSolid}`} href="/signup">
                Scan one project free
              </Link>
              <span className={styles.ctaNote}>No card. Takes about two minutes.</span>
            </div>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.wrap} ${styles.foot}`}>
          <span>Hakscan — QivaLabs LLP, Udaipur</span>
          <span>
            <a href="#limits">What we don&apos;t do</a> &nbsp; <a href="#pricing">Pricing</a> &nbsp;{" "}
            <Link href="/legal/terms">Terms</Link> &nbsp; <a href="#">Privacy</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
