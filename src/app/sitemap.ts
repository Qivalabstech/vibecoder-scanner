import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://hakscan.online";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/login`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/signup`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/legal/terms`, changeFrequency: "monthly", priority: 0.2 },
  ];
}
