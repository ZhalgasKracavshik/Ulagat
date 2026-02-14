import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow all domains for user content (users can paste any URL)
      },
    ],
  },
  /* config options here */
};

export default nextConfig;
