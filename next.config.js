/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    return [
      // Module-specific rewrites to allow independent serving
      {
        source: '/chat/:path*',
        destination: '/modules/chat/:path*',
      },
    ];
  },
  env: {
    OLLAMA_URL: process.env.REACT_APP_OLLAMA_URL || 'http://localhost:11434',
  },
};

module.exports = nextConfig;