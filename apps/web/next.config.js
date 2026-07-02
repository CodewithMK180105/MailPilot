/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@email-platform/shared'],
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
};

module.exports = nextConfig;
