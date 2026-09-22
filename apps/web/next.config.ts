import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
