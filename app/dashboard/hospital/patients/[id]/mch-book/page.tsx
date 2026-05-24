import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/clerk'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getMCHBookDataByPregnancyId, serializeMCHBookData } from '@/lib/mch-book-data'
import MCHBookClient from './mch-book-client'

export default async function MCHBookPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['hospital_staff', 'midwife', 'admin'])
    const user = await currentUser()

    const resolvedParams = await params
    const pregnancyId = resolvedParams.id

    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, user!.id),
    })

    if (!dbUser || !dbUser.hospitalId) {
      redirect('/unauthorized')
    }

    const book = await getMCHBookDataByPregnancyId(pregnancyId)

    if (!book) {
      redirect('/dashboard/hospital')
    }

    const safeData = serializeMCHBookData(book)
    return <MCHBookClient data={safeData} />
  } catch (error) {
    console.error('MCH Book Error:', error)
    redirect('/dashboard/hospital')
  }
}
