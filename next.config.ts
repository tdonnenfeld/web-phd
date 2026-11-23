import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
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
