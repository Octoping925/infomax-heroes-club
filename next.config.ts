import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [new URL("https://nexuscompendium.com/images/portraits/*")],
  },
  reactCompiler: true,
};

export default nextConfig;
