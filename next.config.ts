import type { NextConfig } from "next";

const config: NextConfig = {
  // NEXT_DIST_DIR lets two dev servers run side by side in one checkout.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // PGlite (the zero-setup local database) and sharp ship native or wasm files
  // that must be loaded from node_modules, not bundled.
  serverExternalPackages: ["@electric-sql/pglite", "sharp", "postgres"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.public.blob.vercel-storage.com" }],
  },
};

export default config;
