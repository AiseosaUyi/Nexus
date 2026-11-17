import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Baseline security headers. `frame-ancestors 'none'` stops clickjacking
  // (e.g. framing the OAuth consent page to trick an "Allow" click). A full
  // script-src CSP is intentionally not set yet — it needs browser testing
  // against Tiptap, PostHog, Supabase Realtime and YouTube embeds.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
        ],
      },
    ];
  },

  // Serve the Nexus Brain MCP OAuth server's RFC 8414/9728 metadata at the
  // standard .well-known paths. Defined here (not only a hosting-platform
  // config) so this resolves under `next dev` too. beforeFiles runs ahead
  // of the auth proxy in middleware.ts; /.well-known/* isn't under /w/* or
  // /dashboard, so middleware already passes it through untouched either way.
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/.well-known/oauth-authorization-server",
          destination: "/api/oauth/authorization-server-metadata",
        },
        {
          source: "/.well-known/oauth-protected-resource",
          destination: "/api/oauth/protected-resource-metadata",
        },
      ],
      afterFiles: [
        { source: "/favicon.ico", destination: "/icon.svg" },
      ],
      fallback: [],
    };
  },
};

export default nextConfig;
