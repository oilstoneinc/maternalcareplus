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

  // 4. Render Client Component with real data (or mock fallback if DB is not set up)
  return <PregnantWomanClient user={user} data={data} />
}
