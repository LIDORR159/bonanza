import type { NextConfig } from "next"

/**
 * Hosts product and content images may be loaded from: the Medusa backend
 * (local uploads in development) and the media bucket's public domain.
 */
const imageHosts = (process.env.IMAGE_HOSTNAMES || "localhost")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean)

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
]

const nextConfig: NextConfig = {
  // `standalone` is the self-contained server used by the Docker image. The
  // Cloudflare Workers build (pnpm cf:build) wraps the same Next.js build.
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  // The shared types package is TypeScript source, not a compiled package.
  transpilePackages: ["@bonanza/types"],

  images: {
    remotePatterns: imageHosts.flatMap((hostname) => [
      { protocol: "https" as const, hostname },
      { protocol: "http" as const, hostname },
    ]),
    // Local development serves images from http://localhost:9000.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
    formats: ["image/avif", "image/webp"],
    qualities: [75, 85],
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Never let a shared cache keep personal pages.
        source: "/:path(cart|checkout|account|order)/:rest*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ]
  },

  async rewrites() {
    return {
      beforeFiles: [],
      // Hebrew is the default language and has no URL prefix: `/products` is
      // served by `app/[locale]/products` with locale `he`. A second language
      // gets a prefix (`/en/products`) and needs no further routing changes.
      afterFiles: [
        {
          source: "/:path((?!he(?:/|$)|api/|_next/|brand/|favicon|robots|sitemap|manifest).*)",
          destination: "/he/:path",
        },
      ],
      fallback: [],
    }
  },

  async redirects() {
    return [
      // The prefixed form of the default language is not a second URL for the
      // same page.
      { source: "/he", destination: "/", permanent: true },
      { source: "/he/:path*", destination: "/:path*", permanent: true },
    ]
  },
}

export default nextConfig
