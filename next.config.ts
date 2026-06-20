import type { NextConfig } from "next";

const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "https://whisperbox.koyeb.app").replace(
  /\/$/,
  ""
);

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
