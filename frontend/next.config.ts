import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Output standalone for better Vercel compatibility
  output: "standalone",
};

export default nextConfig;
