import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/clerk'
import { getMCHBookDataForPregnantWoman, serializeMCHBookData } from '@/lib/mch-book-data'
import DigitalMCHBookClient from './digital-mch-book-client'

export const dynamic = 'force-dynamic'

export default async function DigitalMCHBookPage() {
  try {
    await requireRole('pregnant_woman')
    const user = await currentUser()
    if (!user) redirect('/sign-in')

    const { dbUser, book } = await getMCHBookDataForPregnantWoman(user.id)

    if (!dbUser) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] p-8 text-center">
          <div className="max-w-md space-y-4">
            <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🏥</span>
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Awaiting Hospital Registration</h1>
            <p className="text-slate-500">
              Your digital MCH Record Book will be securely generated as soon as your clinical facility formally
              registers your patient profile.
            </p>
          </div>
        </div>
      )
    }

    if (!book) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] p-8 text-center">
          <div className="max-w-md space-y-4">
            <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl text-pink-400 font-bold">✨</span>
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Your Journey Starts Soon</h1>
            <p className="text-slate-500">
              Your digital MCH Record Book will appear here once your hospital registers your pregnancy.
            </p>
          </div>
        </div>
      )
    }

    const safeData = serializeMCHBookData(book)
    return <DigitalMCHBookClient data={safeData} />
  } catch (error: unknown) {
    const digest = (error as { digest?: string })?.digest
    if (digest?.includes('NEXT_REDIRECT')) throw error

    console.error('[DigitalMCHBookPage] Critical error:', error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] p-8 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-2xl font-black text-slate-800">Unable to load MCH Book</h1>
          <p className="text-slate-500">We could not load your records right now. Please try again in a moment.</p>
          <a
            href="/dashboard/pregnant-woman"
            className="inline-block px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }
}
