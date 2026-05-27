import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/clerk'
import { getMidwifeDashboardData } from '@/app/actions'
import MidwifeDashboardClient from './midwife-client'

export default async function MidwifeDashboard() {
  try {
    // 1. Verify role — allow midwife AND hospital_staff (doctors/nurses share this dashboard)
    await requireRole(['midwife', 'hospital_staff', 'admin'])

    // 2. Get Clerk user
    const user = await currentUser()
    if (!user) redirect('/sign-in')

    // 3. Fetch data (returns null if account isn't fully synced yet)
    const data = await getMidwifeDashboardData()

    // 4. If data is null, the account exists in Clerk but the DB sync is still pending
    if (!data) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-md w-full p-10 text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto border border-teal-100">
              <svg className="h-8 w-8 text-teal-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-slate-900">Setting Up Your Account</h2>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">
              Your account is being configured. This usually takes just a moment. Please refresh the page or try again shortly.
            </p>
            <a
              href="/dashboard/midwife"
              className="inline-block mt-2 px-6 py-3 bg-teal-600 text-white rounded-2xl font-bold text-sm hover:bg-teal-700 transition-colors"
            >
              Refresh Dashboard
            </a>
            <p className="text-xs text-slate-400 mt-2">
              If this persists, please contact your hospital administrator.
            </p>
          </div>
        </div>
      )
    }

    // 5. Render client component with safe plain user object
    const plainUser = {
      id: user!.id,
      firstName: user!.firstName,
      lastName: user!.lastName,
      imageUrl: user!.imageUrl,
      emailAddress: user!.emailAddresses[0]?.emailAddress || '',
    }

    return <MidwifeDashboardClient user={plainUser} data={data} />
  } catch (error: any) {
    // Re-throw Next.js redirect/dynamic errors
    if (error?.message?.includes('NEXT_REDIRECT') || error?.digest?.includes('DYNAMIC_SERVER_USAGE')) {
      throw error
    }
    console.error('Critical Midwife Dashboard Error:', error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-md w-full p-10 text-center space-y-4">
          <h2 className="text-2xl font-black text-slate-900">Systems Updating</h2>
          <p className="text-slate-500 font-medium text-sm">
            We're optimizing your dashboard. Please try refreshing in a moment.
          </p>
          <a
            href="/dashboard/midwife"
            className="inline-block px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-colors"
          >
            Refresh Dashboard
          </a>
        </div>
      </div>
    )
  }
}

