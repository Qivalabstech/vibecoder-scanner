import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // this project sits inside a multi-project workspace with its own
  // package-lock.json one level up — pin the root so Turbopack doesn't infer it
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
