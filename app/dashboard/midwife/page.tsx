import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/clerk'
import { getMidwifeDashboardData } from '@/app/actions'
import MidwifeDashboardClient from './midwife-client'

export default async function MidwifeDashboard() {
  // 1. Verify role
  await requireRole(['midwife', 'admin'])

  // 2. Get Clerk user
  const user = await currentUser()
  if (!user) redirect('/sign-in')

  // 3. Fetch data
  const data = await getMidwifeDashboardData()

  // 4. Render client component
  return <MidwifeDashboardClient user={user} data={data} />
}
