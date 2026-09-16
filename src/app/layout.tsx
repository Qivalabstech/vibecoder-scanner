import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

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

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://hakscan.online";
const TITLE = "Hakscan: Find Security Flaws in Your AI-Built App";
const DESCRIPTION =
  "Scan your GitHub repo or live site for vulnerabilities and get an AI-explained, prioritized report with the exact fix — free for your first target, no security background required.";

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
  applicationCategory: "SecurityApplication",
  operatingSystem: "Web",
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
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
