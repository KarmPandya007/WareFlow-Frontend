import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  const isDevelopmentServer = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    // Keep development assets isolated from `next build`. Running a production
    // build while the dev server is open must not invalidate its CSS/JS chunks.
    distDir: isDevelopmentServer ? ".next-dev" : ".next",

    // Most data pages load through mount effects. Disabling the development-only
    // double mount prevents duplicate API requests and loading-state flicker.
    reactStrictMode: false,

    // Produces a self-contained server bundle for Docker / production.
    output: "standalone",
  };
}
