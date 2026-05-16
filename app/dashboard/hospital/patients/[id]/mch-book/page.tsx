import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/clerk'
import { db } from '@/lib/db'
import { 
  users, 
  pregnancies, 
  previousPregnancies, 
  appointments, 
  labTests, 
  deliveries, 
  postnatalCare,
  children
} from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
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

    // Fetch pregnancy with security check
    const pregnancyData = await db.query.pregnancies.findFirst({
      where: and(
        eq(pregnancies.id, pregnancyId),
        eq(pregnancies.hospitalId, dbUser.hospitalId)
      )
    })

    if (!pregnancyData) {
      redirect('/dashboard/hospital')
    }

    // Fetch mother
    const mother = await db.query.users.findFirst({
      where: eq(users.id, pregnancyData.userId)
    })

    // Fetch related records
    const prevPregnancies = await db.query.previousPregnancies.findMany({
      where: eq(previousPregnancies.userId, pregnancyData.userId),
      orderBy: [desc(previousPregnancies.year)]
    })

    const ancVisits = await db.query.appointments.findMany({
      where: eq(appointments.pregnancyId, pregnancyId),
      orderBy: [desc(appointments.scheduledDate)]
    })

    const labs = await db.query.labTests.findMany({
      where: eq(labTests.pregnancyId, pregnancyId),
      orderBy: [desc(labTests.resultDate)]
    })

    const deliveryRecord = await db.query.deliveries.findFirst({
      where: eq(deliveries.pregnancyId, pregnancyId)
    })

    const pncRecords = await db.query.postnatalCare.findMany({
      where: eq(postnatalCare.pregnancyId, pregnancyId),
      orderBy: [desc(postnatalCare.visitDate)]
    })

    const childRecords = await db.query.children.findMany({
      where: eq(children.pregnancyId, pregnancyId)
    })

    const safeData = JSON.parse(JSON.stringify({
      pregnancy: pregnancyData,
      mother,
      previousPregnancies: prevPregnancies,
      ancVisits,
      labs,
      delivery: deliveryRecord,
      postnatalCare: pncRecords,
      children: childRecords
    }))

    return <MCHBookClient data={safeData} />
  } catch (error) {
    console.error('MCH Book Error:', error)
    redirect('/dashboard/hospital')
  }
}
