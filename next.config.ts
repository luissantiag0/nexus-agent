import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force Turbopack to use nexus-agent as the project root
  // Resolves multi-lockfile ambiguity (C:\Users\luiss\package-lock.json vs project lockfile)
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
