import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // 🚀 disables ESLint during build
  },
  reactStrictMode: true,
  swcMinify: false, // Disable SWC minification
  webpack: (config, { dev, isServer }) => {
    if (!dev && isServer) {
      // Disable minification for server-side bundles
      config.optimization.minimize = false;
    }
    return config;
  },
};

export default nextConfig;
