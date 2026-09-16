import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://hakscan.online";

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
