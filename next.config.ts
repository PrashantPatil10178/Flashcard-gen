import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  swcMinify: false,
  eslint: {
    ignoreDuringBuilds: true, // 🚀 disables ESLint during build
  },
  devIndicators: {},
  reactStrictMode: true,
};

export default nextConfig;
