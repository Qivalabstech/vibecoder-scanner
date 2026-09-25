import type { MetadataRoute } from "next";

// www is the live host — hakscan.online (no www) 308-redirects to it, so
// sitemap URLs must use www or Google gets a mixed signal about the
// canonical domain (found via SEO audit).
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.hakscan.online";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1 },
    // /login intentionally excluded — nothing to rank for, and it's now
    // noindex'd (see (auth)/login/page.tsx metadata) so listing it here
    // would just send Google a page it's told not to index.
    { url: `${BASE_URL}/signup`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/legal/terms`, changeFrequency: "monthly", priority: 0.2 },
    { url: `${BASE_URL}/legal/privacy`, changeFrequency: "monthly", priority: 0.2 },
  ];
}
