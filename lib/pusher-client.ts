import PusherClient from 'pusher-js'

const rawKey = process.env.NEXT_PUBLIC_PUSHER_APP_KEY || ''
const rawCluster = process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER || 'mt1'

// Strip outer quotes if present (standard in Windows/Next.js environment parsing)
export const pusherKey = rawKey.replace(/^"|"$/g, '').trim()
export const pusherCluster = rawCluster.replace(/^"|"$/g, '').trim()

export const pusherEnabled = typeof window !== 'undefined' && !!pusherKey && pusherKey !== 'dummy_key' && pusherKey !== ''

// Enable pusher-js logging in development for debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  PusherClient.logToConsole = true
}

export const pusherClient = new PusherClient(
  pusherEnabled ? pusherKey : 'dummy_key',
  {
    cluster: pusherCluster,
    forceTLS: true,
  }
)
