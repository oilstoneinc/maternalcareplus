import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/clerk'
import { getHospitalDashboardData } from '@/app/actions'
import HospitalDashboardClient from './hospital-dashboard-client'

export default async function HospitalDashboard() {
  await requireRole(['hospital_staff', 'admin'])
  const user = await currentUser()
  
  let data = null
  let errorMessage = ''

  try {
    data = await getHospitalDashboardData()
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : String(e)
  }

  if (!data) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'monospace', color: 'red' }}>
        <h1>DATABASE OR ACCESS ERROR</h1>
        <p>{errorMessage || 'No data was returned but no error was thrown.'}</p>
      </div>
    )
  }

  return <HospitalDashboardClient user={user} data={data} />
}
