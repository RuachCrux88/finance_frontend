import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Configuración para Vercel
  output: 'standalone',
};

export default nextConfig;
