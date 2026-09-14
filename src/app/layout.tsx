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

export const metadata: Metadata = {
  title: "Hakscan: Security scans for AI-built apps",
  description:
    "Scan your GitHub repo or live site for vulnerabilities and get an AI-explained, prioritized report you can actually act on.",
  // Site-ownership proof for scanning hakscan.online with our own product —
  // remove once that target no longer needs re-verification.
  other: process.env.SITE_VERIFICATION_TOKEN
    ? { "hakscan-site-verification": process.env.SITE_VERIFICATION_TOKEN }
    : {},
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
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
