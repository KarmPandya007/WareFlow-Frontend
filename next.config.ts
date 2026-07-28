import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained server bundle for Docker / production
  output: "standalone",
};

export default nextConfig;
