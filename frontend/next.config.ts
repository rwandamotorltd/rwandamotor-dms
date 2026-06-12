import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: { ignoreBuildErrors: false },
  experimental: {
    optimizePackageImports: ["recharts", "framer-motion", "lucide-react"],
  },
};

export default nextConfig;
