import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users, pregnancies } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import {
  getVerifiedPregnancyId,
  setVerifiedPregnancyDevice,
  isWithinPrimaryDeviceGraceWindow,
  hasPartnerReadonlySession,
} from '@/lib/partner-session'

/**
 * Full maternal dashboard — mother's trusted device only (not partner read-only session).
 */
export async function requirePregnantWomanDeviceAccess() {
  const user = await currentUser()
  if (!user) redirect('/sign-in')

  if (await hasPartnerReadonlySession(user.id)) {
    redirect('/dashboard/father')
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id),
  })
  if (!dbUser) redirect('/unauthorized')

  const pregnancy = await db.query.pregnancies.findFirst({
    where: and(eq(pregnancies.userId, dbUser.id), eq(pregnancies.status, 'active')),
    orderBy: [desc(pregnancies.createdAt)],
  })

  if (!pregnancy) return

  const verifiedId = await getVerifiedPregnancyId(user.id)
  if (verifiedId === pregnancy.id) return

  if (isWithinPrimaryDeviceGraceWindow(user.createdAt)) {
    await setVerifiedPregnancyDevice(user.id, pregnancy.id)
    return
  }

  redirect('/dashboard/pregnant-woman/partner-access')
}
