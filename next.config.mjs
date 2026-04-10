/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  typedRoutes: true,
  // Disable static generation entirely
  generateStaticParams: false,
};

export default nextConfig;
