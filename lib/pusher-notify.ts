import { pusherServer } from '@/lib/pusher-server'

export async function notifyPregnancyUpdate(
  pregnancyId: string,
  message: string,
  event: 'mch-update' | 'vitals-update' | 'labs-update' = 'mch-update'
) {
  if (
    !process.env.PUSHER_APP_ID ||
    !process.env.NEXT_PUBLIC_PUSHER_APP_KEY ||
    !process.env.PUSHER_APP_SECRET
  ) {
    return
  }

  try {
    await pusherServer.trigger(`pregnancy-${pregnancyId}`, event, { message })
  } catch (err) {
    console.warn('[notifyPregnancyUpdate] Pusher trigger failed:', err)
  }
}
