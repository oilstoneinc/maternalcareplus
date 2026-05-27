import PusherServer from 'pusher'

const appId = (process.env.PUSHER_APP_ID || '').replace(/^"|"$/g, '').trim()
const key = (process.env.NEXT_PUBLIC_PUSHER_APP_KEY || '').replace(/^"|"$/g, '').trim()
const secret = (process.env.PUSHER_APP_SECRET || '').replace(/^"|"$/g, '').trim()
const cluster = (process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER || 'mt1').replace(/^"|"$/g, '').trim()

export const pusherServer = new PusherServer({
  appId,
  key,
  secret,
  cluster,
  useTLS: true,
})
