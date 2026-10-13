/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  typedRoutes: true,
  experimental: {
    ppr: false,
    serverActions: {
      bodySizeLimit: process.env.BODY_SIZE_LIMIT || "20mb",
    },
  },
  // Pages that need dynamic rendering declare `export const dynamic = "force-dynamic"`.
  // Do not lower this to force dynamic rendering — it kills the static worker mid-build.
  staticPageGenerationTimeout: 120,
};

export default nextConfig;
