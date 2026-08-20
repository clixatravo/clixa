import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Un <Link> vers une route inexistante casse le build au lieu de livrer un 404.
  typedRoutes: true,
};

export default withPayload(nextConfig);
