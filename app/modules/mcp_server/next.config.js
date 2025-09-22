/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@anthropic-ai/sdk']
  },
  async rewrites() {
    return [
      {
        source: '/health',
        destination: '/api/health'
      }
    ]
  }
}

module.exports = nextConfig