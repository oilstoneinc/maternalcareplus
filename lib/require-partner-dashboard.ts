import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getPartnerSessionPregnancyId, hasPartnerReadonlySession } from '@/lib/partner-session'
import { getUserRole } from '@/lib/clerk'

/**
 * Partner read-only dashboard: mother's account + partner session cookie, or legacy father role.
 */
export async function requirePartnerDashboardAccess(): Promise<{
  clerkUserId: string
  pregnancyId: string | null
  isReadOnlyPartner: boolean
}> {
  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const role = await getUserRole()
  const partnerPregnancyId = await getPartnerSessionPregnancyId(user.id)

  if (role === 'pregnant_woman') {
    if (!partnerPregnancyId) {
      redirect('/dashboard/pregnant-woman/partner-access')
    }
    return { clerkUserId: user.id, pregnancyId: partnerPregnancyId, isReadOnlyPartner: true }
  }

  if (role === 'father' || role === 'admin') {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, user.id),
    })
    return {
      clerkUserId: user.id,
      pregnancyId: partnerPregnancyId,
      isReadOnlyPartner: role === 'father' && !!(await hasPartnerReadonlySession(user.id)),
    }
  }

  redirect('/unauthorized')
}
