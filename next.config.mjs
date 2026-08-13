/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  compress: true,
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  // Make ALL env vars available at runtime in standalone mode
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_ORDERS_URL: process.env.NEXT_PUBLIC_SUPABASE_ORDERS_URL,
    NEXT_PUBLIC_SUPABASE_ORDERS_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ORDERS_ANON_KEY,
    NEXT_PUBLIC_CLOUDFLARE_R2_ACCOUNT_ID: process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ACCOUNT_ID,
    NEXT_PUBLIC_CLOUDFLARE_R2_ACCESS_KEY_ID: process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ACCESS_KEY_ID,
    NEXT_PUBLIC_CLOUDFLARE_R2_SECRET_ACCESS_KEY: process.env.NEXT_PUBLIC_CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET_NAME: process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET_NAME,
    NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL: process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL,
  },
  async rewrites() {
    return [
      {
        source: '/supabase-proxy/:path*',
        destination: 'http://supabasekong-ghgtfe3p1rtomxjhot908ye7.187.127.220.99.sslip.io/:path*',
      },
    ];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.putimach.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'nmomvkssloqnhogndlwg.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'tvoxogfqxxilvudtdfdj.supabase.co',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: 'upgrade-insecure-requests',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
      {
        source: '/:all*(svg|jpg|png|webp|avif|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
