import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/clerk'
import { getPatientDashboardData } from '@/app/actions'
import PregnantWomanClient from './pregnant-woman-client'
import { DashboardData } from '@/types'

export default async function PregnantWomanDashboard() {
  // 1. Verify role
  await requireRole('pregnant_woman')
  
  // 2. Get current user from Clerk
  const user = await currentUser()
  if (!user) redirect('/sign-in')

  // 3. Fetch data from DB via Server Action
  const data = await getPatientDashboardData() as DashboardData | null

  // 4. Render Client Component with a plain JSON serializable user object
  const plainUser = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
    emailAddress: user.emailAddresses[0]?.emailAddress || '',
  }

  return <PregnantWomanClient user={plainUser} data={data} />
}
