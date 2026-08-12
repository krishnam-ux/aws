import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/admin/login',
        destination: '/admin',
        permanent: true,
      },
      {
        source: '/admin/dashboard',
        destination: '/admin',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
