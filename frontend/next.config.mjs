/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },
  // Ensure Tauri can read local assets properly
  trailingSlash: true,
};

export default nextConfig;
