import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: false,
      },
      {
        source: '/driver',
        destination: '/driver/dashboard',
        permanent: false,
      },
      {
        source: '/register',
        has: [{ type: 'query', key: 'role', value: 'driver' }],
        destination: '/register/driver',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
