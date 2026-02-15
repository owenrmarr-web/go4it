import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/pitch",
        destination: "/deck",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
