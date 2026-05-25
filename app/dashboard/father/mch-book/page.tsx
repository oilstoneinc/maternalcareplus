import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requirePartnerDashboardAccess } from '@/lib/require-partner-dashboard'
import {
  getMCHBookDataForPartner,
  getMCHBookDataByPregnancyId,
  serializeMCHBookData,
} from '@/lib/mch-book-data'
import { getFatherDashboardData } from '@/app/actions'
import DigitalMCHBookClient from '@/app/dashboard/pregnant-woman/digital-mch-book/digital-mch-book-client'

export const dynamic = 'force-dynamic'

export default async function PartnerMCHBookPage() {
  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const { isReadOnlyPartner } = await requirePartnerDashboardAccess()

  let book = null
  if (isReadOnlyPartner) {
    const res = await getMCHBookDataForPartner(user.id)
    book = res.book
  } else {
    const dash = await getFatherDashboardData()
    if (dash?.pregnancy?.id) {
      book = await getMCHBookDataByPregnancyId(dash.pregnancy.id)
    }
  }

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] p-8 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-2xl font-black text-slate-800">MCH book not available yet</h1>
          <p className="text-slate-500">
            Records will appear here once the hospital registers the pregnancy and updates the digital
            MCH book.
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

  const safeData = serializeMCHBookData(book)
  return (
    <DigitalMCHBookClient
      data={safeData}
      readOnly={isReadOnlyPartner}
      backHref="/dashboard/father"
      titleBadge={isReadOnlyPartner ? 'Partner view — read only' : 'Digital MCH Record Book'}
    />
  )
}
