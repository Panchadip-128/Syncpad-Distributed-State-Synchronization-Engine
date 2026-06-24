import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack is default in Next.js 16
  turbopack: {},
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
