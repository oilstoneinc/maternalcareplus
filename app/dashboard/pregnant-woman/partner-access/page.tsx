import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/clerk'
import { db } from '@/lib/db'
import { users, pregnancies } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import {
  getVerifiedPregnancyId,
  setVerifiedPregnancyDevice,
  isWithinPrimaryDeviceGraceWindow,
} from '@/lib/partner-session'
import PartnerAccessClient from './partner-access-client'

export default async function PartnerAccessPage() {
  await requireRole('pregnant_woman')
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

  if (!pregnancy) {
    redirect('/dashboard/pregnant-woman')
  }

  const verifiedPregnancyId = await getVerifiedPregnancyId(dbUser.id)
  if (verifiedPregnancyId === pregnancy.id) {
    redirect('/dashboard/pregnant-woman')
  }

  if (isWithinPrimaryDeviceGraceWindow(user.createdAt)) {
    await setVerifiedPregnancyDevice(dbUser.id, pregnancy.id)
    redirect('/dashboard/pregnant-woman')
  }

  return (
    <PartnerAccessClient
      motherFirstName={dbUser.firstName || user.firstName || 'there'}
    />
  )
}
