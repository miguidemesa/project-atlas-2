import type { NextConfig } from "next";

// listing photos are served by the API at /uploads/...; next/image only loads hosts listed here
const api = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5080");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: api.protocol === "https:" ? "https" : "http",
        hostname: api.hostname,
        port: api.port,
        pathname: "/uploads/**",
      },
    ],
  },
};

export default nextConfig;
