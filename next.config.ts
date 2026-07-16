import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Strips console.log/console.warn from the production client bundle
  // (console.error is kept so real errors are still visible). Removes
  // dead-weight JS from every page and avoids leaking debug info in the
  // browser console.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },

  // Don't advertise the framework in response headers.
  poweredByHeader: false,

  // Gzip/Brotli compression for served assets (on by default, kept
  // explicit here so it isn't accidentally disabled later).
  compress: true,

  // Tree-shakes these icon/utility libraries so only the specific
  // icons/components actually imported end up in the client bundle,
  // instead of the whole package.
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

export default nextConfig;
