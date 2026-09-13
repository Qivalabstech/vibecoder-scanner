import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
