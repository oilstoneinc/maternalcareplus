import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/clerk'
import { getFatherDashboardData } from '@/app/actions'
import FatherDashboardClient from './father-client'

export default async function FatherDashboard() {
  await requireRole(['father', 'admin'])

  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const data = await getFatherDashboardData()

  const plainUser = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
    emailAddress: user.emailAddresses[0]?.emailAddress || '',
  }

  return <FatherDashboardClient user={plainUser} data={data} />
}
