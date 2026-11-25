import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  experimental: {
    middlewareClientMaxBodySize: 32 * 1024 * 1024,
  },
  // Quartz publishes folder pages at /knowledge/<vault>/index.html. Preserve
  // trailing slashes instead of redirecting folders to extensionless paths;
  // nginx then serves the folder index without revealing its Docker hostname.
  skipTrailingSlashRedirect: true,
  async redirects() {
    // Quartz emits relative CSS/JS/search-index URLs. At /knowledge (no trailing
    // slash) browsers resolve them against /, causing 404s. Serve the actual
    // index.html so the browser resolves them under /knowledge/ instead.
    return [{ source: "/knowledge", destination: "/knowledge/index.html", permanent: false }];
  },
  async rewrites() {
    return [
      { source: "/knowledge", destination: "http://phd-quartz/knowledge/" },
      { source: "/knowledge/:path*", destination: "http://phd-quartz/knowledge/:path*" },
    ];
  },
};
export default config;
