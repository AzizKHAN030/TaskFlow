import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allows a verification build alongside an already-running development server.
  distDir: process.env.NEXT_DIST_DIR ?? ".next"
};

export default nextConfig;
