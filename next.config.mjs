import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false,
  },
  images: {
    domains: ['firebasestorage.googleapis.com'],
    unoptimized: true, // Required for static export
  },
  output: 'export', // Enable static exports
  trailingSlash: true, // Recommended for static hosting
  distDir: 'out', // Output directory for static files
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest.json$/],
  publicExcludes: ['!robots.txt', '!sitemap.xml'],
})(nextConfig);
