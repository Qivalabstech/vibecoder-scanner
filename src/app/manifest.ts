import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest (Next's convention for this file — see
// node_modules/next/dist/esm/lib/metadata/get-metadata-route.js), which is
// the path browsers and audit tools actually look for via the auto-injected
// <link rel="manifest"> tag, not a literal /manifest.json.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hakscan",
    short_name: "Hakscan",
    description: "Security scanning for AI-built apps — GitHub repos and live sites.",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0D0F",
    theme_color: "#0A0D0F",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
