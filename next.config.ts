import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["**.manuspre.computer"],
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
