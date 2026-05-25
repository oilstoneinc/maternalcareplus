import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users, pregnancies } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import {
  getVerifiedPregnancyId,
  setVerifiedPregnancyDevice,
  isWithinPrimaryDeviceGraceWindow,
} from '@/lib/partner-session'

/**
 * Ensures this browser has verified access (mother's primary device or partner code).
 * Redirects to partner-access gate when not verified.
 */
export async function requirePregnantWomanDeviceAccess() {
  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id),
  })
  if (!dbUser) redirect('/unauthorized')

  const pregnancy = await db.query.pregnancies.findFirst({
    where: and(eq(pregnancies.userId, dbUser.id), eq(pregnancies.status, 'active')),
    orderBy: [desc(pregnancies.createdAt)],
  })

  if (!pregnancy) return

  const verifiedId = await getVerifiedPregnancyId(dbUser.id)
  if (verifiedId === pregnancy.id) return

  if (isWithinPrimaryDeviceGraceWindow(user.createdAt)) {
    await setVerifiedPregnancyDevice(dbUser.id, pregnancy.id)
    return
  }

  redirect('/dashboard/pregnant-woman/partner-access')
}
