import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack is default in Next.js 16 — no custom webpack or alias needed.
  // Yjs deduplication is handled automatically by the bundler.
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://your-backend.railway.app/:path*",
      },
    ];
  },
};

export default nextConfig;
