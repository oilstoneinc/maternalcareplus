import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/clerk'
import { getHospitalDashboardData } from '@/app/actions'
import HospitalDashboardClient from './hospital-dashboard-client'

export default async function HospitalDashboard() {
  try {
    await requireRole(['hospital_staff', 'admin'])
    const user = await currentUser()
    
    const data = await getHospitalDashboardData()

    if (!data) {
      redirect('/unauthorized')
    }

    // SANITIZATION: Handle Date serialization issues for production
    // Next.js can sometimes have issues passing raw Date objects through the RSC boundary
    // in some production configurations. We convert to a plain JSON object with strings.
    const safeData = JSON.parse(JSON.stringify(data))
    
    // Safety check for user object as well
    const safeUser = user ? JSON.parse(JSON.stringify(user)) : null

    return <HospitalDashboardClient user={safeUser} data={safeData} />
  } catch (error: any) {
    // If it's a redirect error or dynamic usage error, re-throw it so Next.js can handle it
    if (error?.message?.includes('NEXT_REDIRECT') || error?.digest?.includes('DYNAMIC_SERVER_USAGE')) {
      throw error
    }
    
    console.error('Critical Hospital Dashboard Render Error:', error)
    
    // Render a safe error fallback instead of crashing with a generic Next.js page
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-lg w-full text-center">
          <h2 className="text-2xl font-black text-slate-900 mb-2">Systems Updating</h2>
          <p className="text-slate-500 mb-6 font-medium">We're optimizing your dashboard data. Please try refreshing in a moment.</p>
          <button 
             onClick={() => window.location.reload()}
             className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors"
          >
            Refresh Dashboard
          </button>
        </div>
      </div>
    )
  }
}
