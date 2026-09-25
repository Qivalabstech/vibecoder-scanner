import type { MetadataRoute } from "next";

// www is the live host — see sitemap.ts for why this can't be the bare domain.
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.hakscan.online";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Auth-gated app surfaces — nothing for a crawler to index, and no
      // reason to advertise the URL shape of the authenticated product.
      disallow: ["/dashboard", "/targets", "/settings", "/admin"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
