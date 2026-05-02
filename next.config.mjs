/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  typedRoutes: true,
  // Force all pages to be dynamic globally
  experimental: {
    ppr: false,
    serverActions: {
      bodySizeLimit: process.env.BODY_SIZE_LIMIT || "20mb",
    },
  },
  staticPageGenerationTimeout: 1,
};

export default nextConfig;
