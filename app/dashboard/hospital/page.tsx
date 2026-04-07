import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/clerk'
import { getHospitalDashboardData } from '@/app/actions'
import HospitalDashboardClient from './hospital-dashboard-client'

export default async function HospitalDashboard() {
  await requireRole(['hospital_staff', 'admin'])
  const user = await currentUser()
  
  const data = await getHospitalDashboardData()

  return <HospitalDashboardClient user={user} data={data} />
}
