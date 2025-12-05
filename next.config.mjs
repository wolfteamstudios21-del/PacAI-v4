/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy API calls to Express backend
  async rewrites() {
    return [
      {
        source: '/v5/:path*',
        destination: process.env.API_URL 
          ? `${process.env.API_URL}/v5/:path*` 
          : 'http://localhost:5000/v5/:path*',
      },
      {
        source: '/api/v5/:path*',
        destination: process.env.API_URL 
          ? `${process.env.API_URL}/v5/:path*` 
          : 'http://localhost:5000/v5/:path*',
      },
    ];
  },

  // Environment variables available to client
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  },

  // Image optimization
  images: {
    domains: ['pacaiwolfstudio.com'],
  },

  // Disable strict mode in development for easier debugging
  reactStrictMode: true,

  // Suppress specific ESLint rules during build
  eslint: {
    ignoreDuringBuilds: true,
  },

  // TypeScript config
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
