import { db } from '@/lib/db'
import { notifications, pregnancies } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { pusherServer } from '@/lib/pusher-server'

const EVENT_TITLES: Record<string, string> = {
  'mch-update': 'MCH record updated',
  'vitals-update': 'New vitals recorded',
  'labs-update': 'Lab or scan results added',
  appointment: 'Visit scheduled',
  message: 'New message',
  facility_visit: 'Care at another hospital',
}

export async function notifyPatientForPregnancy(
  pregnancyId: string,
  message: string,
  type: string = 'clinical_update',
  event:
    | 'mch-update'
    | 'vitals-update'
    | 'labs-update'
    | 'appointment'
    | 'message' = 'mch-update'
) {
  try {
    const pregnancy = await db.query.pregnancies.findFirst({
      where: eq(pregnancies.id, pregnancyId),
    })
    if (!pregnancy) return

    const title = EVENT_TITLES[event] || EVENT_TITLES['mch-update']

    const [row] = await db
      .insert(notifications)
      .values({
        userId: pregnancy.userId,
        pregnancyId,
        title,
        message,
        type,
        sentAt: new Date(),
        isRead: false,
      })
      .returning()

    const payload = {
      id: row.id,
      title,
      message,
      type,
      pregnancyId,
      createdAt: row.createdAt,
      isRead: false,
    }

    if (
      process.env.PUSHER_APP_ID &&
      process.env.NEXT_PUBLIC_PUSHER_APP_KEY &&
      process.env.PUSHER_APP_SECRET
    ) {
      await pusherServer.trigger(`pregnancy-${pregnancyId}`, event, { message })
      await pusherServer.trigger(`user-${pregnancy.userId}`, 'notification', payload)
    }
  } catch (err) {
    console.warn('[notifyPatientForPregnancy] failed:', err)
  }
}
