/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.putimach.com',
      },
      {
        protocol: 'https',
        hostname: 'nmomvkssloqnhogndlwg.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'tvoxogfqxxilvudtdfdj.supabase.co',
      }
    ],
  },
};

export default nextConfig;
