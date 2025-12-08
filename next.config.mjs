/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy API calls to Express backend (server-side)
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: '/v5/:path*',
        destination: `${apiUrl}/v5/:path*`,
      },
    ];
  },

  // Image optimization
  images: {
    domains: ['pacaiwolfstudio.com'],
  },

  // Enable React strict mode
  reactStrictMode: true,

  // Suppress build errors for faster iteration
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
