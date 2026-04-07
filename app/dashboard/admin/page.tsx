import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/clerk'
import { getAdminDashboardData } from '@/app/actions'
import AdminDashboardClient from './admin-client'

export default async function AdminDashboard() {
  // 1. Verify role
  await requireRole('admin')

  // 2. Get Clerk user
  const user = await currentUser()
  if (!user) redirect('/sign-in')

  // 3. Fetch data
  const data = await getAdminDashboardData()

  // 4. Render client component
  return <AdminDashboardClient user={user} data={data} />
}
