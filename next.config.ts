import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["argon2", "pino", "pino-pretty"],
};

export default nextConfig;
