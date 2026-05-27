import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users, pregnancies, hospitals } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import ChatHub from '@/components/dashboard/ChatHub'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, HeartPulse } from 'lucide-react'

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ with: string }>
}) {
  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id),
  })

  if (!dbUser) redirect('/onboarding')

  if (dbUser.role === 'pregnant_woman') {
  }

  const resolvedParams = await searchParams
  const otherUserId = resolvedParams.with

  if (!otherUserId) {
    return (
      <div className="min-h-screen bg-[#F6F4F3] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-sm border border-slate-100 mx-auto">
            <HeartPulse className="w-8 h-8 text-[#D48BA1]" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">No conversation selected</h2>
          <p className="text-slate-500 font-medium">Please select a conversation from your dashboard to begin chatting.</p>
          <Link
            href={
              dbUser.role === 'hospital_staff' || dbUser.role === 'admin' || dbUser.role === 'midwife'
                ? '/dashboard/hospital'
                : '/dashboard/pregnant-woman'
            }
            className="inline-flex items-center gap-2 text-sm font-bold text-[#D48BA1] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </Link>
          {(dbUser.role === 'hospital_staff' || dbUser.role === 'midwife') && (
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Open the <strong>Messages</strong> tab on your dashboard to see patient conversations.
            </p>
          )}
        </div>
      </div>
    )
  }

  const otherUser = await db.query.users.findFirst({
    where: eq(users.id, otherUserId),
  })

  if (!otherUser) {
    return (
      <div className="min-h-screen bg-[#F6F4F3] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <p className="text-xl font-black text-slate-900">User not found.</p>
          <Link
            href={
              dbUser.role === 'midwife'
                ? '/dashboard/hospital'
                : `/dashboard/${dbUser.role.replace('_', '-')}`
            }
            className="text-sm font-bold text-[#D48BA1] hover:underline flex items-center gap-1 justify-center"
          >
            <ArrowLeft className="w-4 h-4" /> Go back
          </Link>
        </div>
      </div>
    )
  }

  let contactPhone: string | null = null
  let pregnancyId: string | undefined

  if (dbUser.role === 'pregnant_woman') {
    const pregnancy = await db.query.pregnancies.findFirst({
      where: and(eq(pregnancies.userId, dbUser.id), eq(pregnancies.status, 'active')),
    })
    if (pregnancy) {
      pregnancyId = pregnancy.id
      const hospital = await db.query.hospitals.findFirst({
        where: eq(hospitals.id, pregnancy.hospitalId),
      })
      contactPhone = hospital?.phone ?? null
    }
  } else if (['midwife', 'hospital_staff', 'admin'].includes(dbUser.role)) {
    contactPhone = otherUser.phone ?? null
    const patientPregnancy = await db.query.pregnancies.findFirst({
      where: and(eq(pregnancies.userId, otherUserId), eq(pregnancies.status, 'active')),
    })
    pregnancyId = patientPregnancy?.id
  }

  // Determine back URL based on current user's role
  const backUrl =
    dbUser.role === 'pregnant_woman'
      ? '/dashboard/pregnant-woman'
      : dbUser.role === 'midwife' || dbUser.role === 'hospital_staff' || dbUser.role === 'admin'
        ? '/dashboard/hospital'
        : '/dashboard/father'

  return (
    <div className="min-h-screen bg-[#F6F4F3]">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href={backUrl}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Secure Messages</h1>
            <p className="text-slate-500 font-medium text-sm">Real-time clinical communication · HIPAA encrypted</p>
          </div>
        </div>

        {/* Chat Component */}
        <ChatHub
          currentUserId={dbUser.id}
          otherUserId={otherUser.id}
          otherUserName={`${otherUser.firstName} ${otherUser.lastName}`}
          otherUserRole={otherUser.role}
          pregnancyId={pregnancyId}
          contactPhone={contactPhone}
        />
      </div>
    </div>
  )
}
