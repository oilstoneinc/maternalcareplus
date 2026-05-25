import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/clerk'
import { getFatherDashboardData } from '@/app/actions'
import {
  getMCHBookDataByPregnancyId,
  serializeMCHBookData,
} from '@/lib/mch-book-data'
import DigitalMCHBookClient from '@/app/dashboard/pregnant-woman/digital-mch-book/digital-mch-book-client'

export const dynamic = 'force-dynamic'

export default async function FatherMCHBookPage() {
  await requireRole(['father', 'admin'])

  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const dash = await getFatherDashboardData()
  const pregnancyId = dash?.pregnancy?.id

  if (!pregnancyId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] p-8 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-2xl font-black text-slate-800">Not linked yet</h1>
          <p className="text-slate-500">
            Complete registration from your hospital invitation email, then enter the partner code
            from your dashboard to unlock read-only access.
          </p>
          <a
            href="/dashboard/father"
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold"
          >
            Back to Partner Dashboard
          </a>
        </div>
      </div>
    )
  }

  const book = await getMCHBookDataByPregnancyId(pregnancyId)

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] p-8 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-2xl font-black text-slate-800">MCH book not available yet</h1>
          <a
            href="/dashboard/father"
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold"
          >
            Back to Partner Dashboard
          </a>
        </div>
      </div>
    )
  }

  const safeData = serializeMCHBookData(book)
  return (
    <DigitalMCHBookClient
      data={safeData}
      readOnly
      backHref="/dashboard/father"
      titleBadge="Partner view — read only"
    />
  )
}
