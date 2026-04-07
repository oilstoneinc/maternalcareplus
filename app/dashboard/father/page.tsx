import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/clerk'
import { getFatherDashboardData } from '@/app/actions'
import FatherDashboardClient from './father-client'

export default async function FatherDashboard() {
  // 1. Verify role
  await requireRole(['father', 'admin'])

  // 2. Get Clerk user
  const user = await currentUser()
  if (!user) redirect('/sign-in')

  // 3. Fetch data
  const data = await getFatherDashboardData()

  // 4. Render client component
  return <FatherDashboardClient user={user} data={data} />
}
