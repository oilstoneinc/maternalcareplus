import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/clerk'
import { db } from '@/lib/db'
import { 
  users, 
  pregnancies, 
  children,
  immunizations,
  childGrowth
} from '@/lib/db/schema'
import { eq, and, desc, asc } from 'drizzle-orm'
import ChildHealthClient from './child-health-client'

export default async function ChildHealthPage({ params }: { params: Promise<{ id: string }> }) {
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

    // Fetch child record
    const childRecord = await db.query.children.findFirst({
      where: eq(children.pregnancyId, pregnancyId)
    })

    if (!childRecord) {
      // Child not yet provisioned (no delivery recorded)
      redirect(`/dashboard/hospital/patients/${pregnancyId}/mch-book`)
    }

    // Fetch immunizations
    const immunizationsData = await db.query.immunizations.findMany({
      where: eq(immunizations.childId, childRecord.id),
      orderBy: [asc(immunizations.targetAge), asc(immunizations.vaccineName)]
    })

    // Fetch growth records
    const growthData = await db.query.childGrowth.findMany({
      where: eq(childGrowth.childId, childRecord.id),
      orderBy: [desc(childGrowth.recordDate)]
    })

    const safeData = JSON.parse(JSON.stringify({
      pregnancy: pregnancyData,
      child: childRecord,
      immunizations: immunizationsData,
      growth: growthData
    }))

    return <ChildHealthClient data={safeData} />
  } catch (error) {
    console.error('Child Health Page Error:', error)
    redirect('/dashboard/hospital')
  }
}
