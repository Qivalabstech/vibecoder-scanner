import type { NextConfig } from "next";
import path from "path";

// PayPal's JS SDK renders its buttons in a cross-origin iframe and needs
// script/frame/connect access; Supabase needs connect-src for auth+data.
// The inline theme-init script in src/app/layout.tsx needs script-src
// 'unsafe-inline' until it's worth plumbing a per-request nonce through.
// React/Turbopack's dev-mode tooling needs eval() for HMR and debugging —
// never shipped in production, so scope it to dev only rather than
// weakening the production CSP.
const isDev = process.env.NODE_ENV !== "production";

// PAYPAL_ENV=sandbox serves its button/logger traffic from
// www.sandbox.paypal.com, not www.paypal.com — allow both so this
// doesn't silently break again the day PAYPAL_ENV flips to live.
const PAYPAL_ORIGINS = "https://www.paypal.com https://www.sandbox.paypal.com";

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval' " : ""}${PAYPAL_ORIGINS}`,
  "style-src 'self' 'unsafe-inline'",
  // PayPal's button SDK renders its own logo/card-icon <img> tags into our
  // document at runtime (not in our source, so a grep for <img> missed
  // this) - found by testing after tightening this, not assumed.
  "img-src 'self' data: https://www.paypalobjects.com",
  "font-src 'self' data:",
  `connect-src 'self' ${isDev ? "ws: " : ""}https://api-m.paypal.com https://api-m.sandbox.paypal.com ${PAYPAL_ORIGINS} https://*.supabase.co`,
  `frame-src ${PAYPAL_ORIGINS}`,
  "frame-ancestors 'self'",
  "base-uri 'self'",
  `form-action 'self' ${PAYPAL_ORIGINS}`,
].join("; ");

const nextConfig: NextConfig = {
  // this project sits inside a multi-project workspace with its own
  // package-lock.json one level up — pin the root so Turbopack doesn't infer it
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Found by scanning our own production site with this product: several
  // standard security headers were missing. Deliberately NOT setting
  // Cross-Origin-Embedder-Policy — that would require every cross-origin
  // resource (including PayPal's button iframe) to opt in via CORP/CORS,
  // and PayPal's SDK doesn't; shipping COEP would break checkout to close
  // an informational scanner finding, which isn't a good trade.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
};

export default nextConfig;
