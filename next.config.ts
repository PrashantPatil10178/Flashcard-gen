import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // 🚀 disables ESLint during build
  },
  reactStrictMode: true,
};

export default nextConfig;
