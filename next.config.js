/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['prisma', '@prisma/client']
  },
   images: {
    domains: ['upload.wikimedia.org', 'images.metmuseum.org', 'localhost'], // ← ADD images.metmuseum.org
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.metmuseum.org', // ← ADD THIS
        port: '',
        pathname: '/**',
      }
    ]
  },
  // Force environment variable loading
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    USE_DATABASE_RAG: process.env.USE_DATABASE_RAG,
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ]
      }
    ]
  }
}

module.exports = nextConfig