import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      { source: "/knowledge", destination: "http://phd-quartz/knowledge/" },
      { source: "/knowledge/:path*", destination: "http://phd-quartz/knowledge/:path*" },
    ];
  },
};
export default config;
