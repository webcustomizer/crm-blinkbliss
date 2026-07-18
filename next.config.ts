import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 1. Bundle optimization
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },

  // 2. Don't advertise framework
  poweredByHeader: false,

  // 3. Enable compression
  compress: true,

  // 4. Tree-shake unused imports
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@radix-ui/*'],
    // Partial pre-rendering for better performance
    ppr: true,
  },

  // 5. Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [320, 640, 960, 1280, 1600],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  },

  // 6. Enable SWC minification (faster builds)
  swcMinify: true,

  // 7. Production optimizations
  productionBrowserSourceMaps: false,

  // 8. Headers for caching
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, s-maxage=120',
          },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
