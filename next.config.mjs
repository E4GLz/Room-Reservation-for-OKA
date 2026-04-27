/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  typedRoutes: true,
  // Force all pages to be dynamic globally
  experimental: {
    ppr: false,
  },
  staticPageGenerationTimeout: 1,
};

export default nextConfig;
