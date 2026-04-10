/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  typedRoutes: true,
  generateStaticParams: false,
  // Force all pages to be dynamic globally
  experimental: {
    ppr: false,
  },
  staticPageGenerationTimeout: 1,
};

export default nextConfig;