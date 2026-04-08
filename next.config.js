/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@neondatabase/serverless'],
  env: {
    NEON_DATABASE_URL: process.env.NEON_DATABASE_URL,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
    NEON_DATABASE_URL: process.env.NEON_DATABASE_URL,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
    PUSHER_APP_ID: process.env.PUSHER_APP_ID,
    NEXT_PUBLIC_PUSHER_APP_KEY: process.env.NEXT_PUBLIC_PUSHER_APP_KEY,
    PUSHER_APP_SECRET: process.env.PUSHER_APP_SECRET,
    NEXT_PUBLIC_PUSHER_APP_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER
  }
}

module.exports = nextConfig
