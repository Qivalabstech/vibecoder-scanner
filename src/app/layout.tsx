import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const GA_MEASUREMENT_ID = "G-EV1X42GRGN";

// Brand typeface: JetBrains Mono, one family for both headings and body —
// "one typeface, three weights" per the brand guidelines. Monospace
// throughout is deliberate, not a placeholder.
const jbm = localFont({
  variable: "--font-jbm",
  src: [
    { path: "./fonts/jbm-regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/jbm-medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/jbm-bold.ttf", weight: "700", style: "normal" },
  ],
});

// www is the host that's actually live — hakscan.online (no www) 308-
// redirects to it. Every canonical/sitemap/robots URL must point at the
// live host, or Google gets mixed signals about which one is real (found
// via SEO audit — this was previously pointing at the redirecting host).
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.hakscan.online";
const TITLE = "Hakscan: Find Security Flaws in Your AI-Built App";
// Kept to ~150 chars so Google doesn't truncate it in search results
// (the previous version ran to ~180 chars).
const DESCRIPTION =
  "Scan your GitHub repo or live site for security flaws. Get a plain-English report with the exact fix. First project free, no security background needed.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    siteName: "Hakscan",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  // Site-ownership proof for scanning hakscan.online with our own product —
  // remove once that target no longer needs re-verification.
  other: process.env.SITE_VERIFICATION_TOKEN
    ? { "hakscan-site-verification": process.env.SITE_VERIFICATION_TOKEN }
    : {},
};

// SoftwareApplication schema — name/description/pricing match the real
// product and the live PayPal plan, not placeholder copy.
const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Hakscan",
  description: DESCRIPTION,
  url: BASE_URL,
  image: `${BASE_URL}/opengraph-image`,
  applicationCategory: "SecurityApplication",
  operatingSystem: "Web",
  publisher: { "@type": "Organization", name: "QivaLabs LLP" },
  offers: [
    { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
    {
      "@type": "Offer",
      name: "Pro",
      price: "24",
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "24",
        priceCurrency: "USD",
        billingDuration: "P1M",
      },
    },
  ],
  // aggregateRating deliberately omitted — no real reviews exist yet, and
  // schema.org rating markup without genuine reviews backing it is exactly
  // the kind of thing that gets a manual action from Google.
};

// Organization schema — sameAs links the brand to profiles Google can
// already crawl (Product Hunt, Better Launch), which helps establish the
// brand entity for a domain this new.
const organizationData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Hakscan",
  url: BASE_URL,
  logo: `${BASE_URL}/icon.png`,
  sameAs: ["https://www.producthunt.com/products/hakscan-ai", "https://www.betterlaunch.co/product/hakscan"],
};

// Runs before paint: defaults to dark unless the visitor explicitly chose light.
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var isLight = stored === "light";
    document.documentElement.classList.toggle("dark", !isLight);
  } catch (e) {
    document.documentElement.classList.add("dark");
  }
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jbm.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
        />
        {/* afterInteractive (not beforeInteractive) — GA doesn't need to
            block first paint, and next/script defers it off the critical
            path automatically. Requires googletagmanager.com/google-
            analytics.com in the CSP (next.config.ts) or gtag's requests
            get silently blocked rather than just not-yet-loaded. */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
