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
  children,
  immunizations,
  childGrowth
} from '@/lib/db/schema'
import { eq, and, desc, asc } from 'drizzle-orm'
import DigitalMCHBookClient from './digital-mch-book-client'

export default async function DigitalMCHBookPage() {
  await requireRole('pregnant_woman')
  const user = await currentUser()
  if (!user) redirect('/sign-in')
  
  // Fetch DB user
  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id)
  })

  if (!dbUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] p-8 text-center">
        <div className="max-w-md space-y-4">
           <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-6">
             <span className="text-4xl">🏥</span>
           </div>
           <h1 className="text-3xl font-black text-slate-800 tracking-tight">Awaiting Hospital Registration</h1>
           <p className="text-slate-500">Your digital MCH Record Book will be securely generated as soon as your clinical facility formally registers your patient profile.</p>
        </div>
      </div>
    )
  }

  // Fetch active/recent pregnancy
  const pregnancyData = await db.query.pregnancies.findFirst({
    where: and(
      eq(pregnancies.userId, dbUser.id),
      eq(pregnancies.status, 'active') // Ensure we use status='active' per schema
    ),
    orderBy: [desc(pregnancies.createdAt)]
  })

  if (!pregnancyData) {
    // If no pregnancy, maybe they are just starting
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] p-8 text-center">
        <div className="max-w-md space-y-4">
           <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-6">
             <span className="text-4xl text-pink-400 font-bold">✨</span>
           </div>
           <h1 className="text-3xl font-black text-slate-800 tracking-tight">Your Journey Starts Soon</h1>
           <p className="text-slate-500">Your digital MCH Record Book will appear here once your hospital registers your pregnancy.</p>
        </div>
      </div>
    )
  }

  // Fetch related records for the woman's view
  const prevPregnancies = await db.query.previousPregnancies.findMany({
    where: eq(previousPregnancies.userId, dbUser.id),
    orderBy: [desc(previousPregnancies.year)]
  })

  const ancVisits = await db.query.appointments.findMany({
    where: eq(appointments.pregnancyId, pregnancyData.id),
    orderBy: [asc(appointments.scheduledDate)]
  })

  const labs = await db.query.labTests.findMany({
    where: eq(labTests.pregnancyId, pregnancyData.id),
    orderBy: [desc(labTests.resultDate)]
  })

  const deliveryRecord = await db.query.deliveries.findFirst({
    where: eq(deliveries.pregnancyId, pregnancyData.id)
  })

  const pncRecords = await db.query.postnatalCare.findMany({
    where: eq(postnatalCare.pregnancyId, pregnancyData.id),
    orderBy: [desc(postnatalCare.visitDate)]
  })

  const childRecords = await db.query.children.findMany({
    where: eq(children.pregnancyId, pregnancyData.id)
  })

  let childId = childRecords[0]?.id
  let immunizationsData: any[] = []
  let growthData: any[] = []

  if (childId) {
    immunizationsData = await db.query.immunizations.findMany({
      where: eq(immunizations.childId, childId),
      orderBy: [asc(immunizations.createdAt)]
    })

    growthData = await db.query.childGrowth.findMany({
      where: eq(childGrowth.childId, childId),
      orderBy: [asc(childGrowth.recordDate)]
    })
  }

  const safeData = JSON.parse(JSON.stringify({
    pregnancy: pregnancyData,
    mother: dbUser,
    previousPregnancies: prevPregnancies,
    ancVisits,
    labs,
    delivery: deliveryRecord,
    postnatalCare: pncRecords,
    children: childRecords,
    immunizations: immunizationsData,
    growth: growthData
  }))

  return <DigitalMCHBookClient data={safeData} />
}
