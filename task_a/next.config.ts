import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/adapter-libsql"],
  turbopack: { root: process.cwd() },
};

export default nextConfig;
