import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: ["http://localhost:3000", "neuro.mdp.dpdns.org"],
};

export default nextConfig;
