import { redirect } from 'next/navigation'
import { getUserRole } from '@/lib/clerk'

/** Father read-only dashboard — requires father or admin role */
export async function requirePartnerDashboardAccess() {
  const role = await getUserRole()
  if (role !== 'father' && role !== 'admin') {
    redirect('/unauthorized')
  }
}
