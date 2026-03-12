/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
    unoptimized: true, 
  },
};

module.exports = nextConfig;
