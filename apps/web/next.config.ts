import type { NextConfig } from "next";
import { buildCsp } from "./src/lib/security/csp";

const CSP_REPORT_ONLY = buildCsp({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  posthogHost: process.env.NEXT_PUBLIC_POSTHOG_KEY ? process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com" : undefined,
  isDev: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  // Baseline security headers. The enforced CSP only covers framing/base/
  // plugins (`frame-ancestors 'none'` stops clickjacking the OAuth consent
  // page). The full policy runs report-only until /api/csp-report shows no
  // violations on real traffic — then rename that header to enforce it.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
          // Full policy in report-only mode (see src/lib/security/csp.ts).
          { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
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
