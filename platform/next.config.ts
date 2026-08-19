import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Un <Link> vers une route inexistante casse le build au lieu de livrer un 404.
  typedRoutes: true,
};

export default nextConfig;
