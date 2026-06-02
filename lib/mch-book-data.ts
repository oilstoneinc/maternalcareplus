import { db } from '@/lib/db'
import { ensureMCHSchema } from '@/lib/db/ensure-mch-schema'
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
  childGrowth,
  vitalSigns,
  hospitals,
} from '@/lib/db/schema'
import { eq, and, desc, asc, ne } from 'drizzle-orm'
async function safeQuery<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[getMCHBookData] ${label}:`, err)
    return fallback
  }
}

export type MCHBookData = {
  pregnancy: typeof pregnancies.$inferSelect
  mother: typeof users.$inferSelect | null
  hospital: typeof hospitals.$inferSelect | null
  previousPregnancies: (typeof previousPregnancies.$inferSelect)[]
  ancVisits: (typeof appointments.$inferSelect)[]
  vitals: (typeof vitalSigns.$inferSelect)[]
  labs: (typeof labTests.$inferSelect)[]
  delivery: typeof deliveries.$inferSelect | null
  postnatalCare: (typeof postnatalCare.$inferSelect)[]
  children: (typeof children.$inferSelect)[]
  immunizations: (typeof immunizations.$inferSelect)[]
  growth: (typeof childGrowth.$inferSelect)[]
}

export async function getMCHBookDataByPregnancyId(pregnancyId: string): Promise<MCHBookData | null> {
  await ensureMCHSchema()

  const pregnancy = await safeQuery('pregnancy', () =>
    db.query.pregnancies.findFirst({ where: eq(pregnancies.id, pregnancyId) }),
    null
  )

  if (!pregnancy) return null

  const mother = await safeQuery('mother', () =>
    db.query.users.findFirst({ where: eq(users.id, pregnancy.userId) }),
    null
  )

  const hospital = await safeQuery('hospital', () =>
    db.query.hospitals.findFirst({ where: eq(hospitals.id, pregnancy.hospitalId) }),
    null
  )

  if (mother) {
    try {
      const pastPregs = await db.query.pregnancies.findMany({
        where: and(
          eq(pregnancies.userId, mother.id),
          ne(pregnancies.id, pregnancyId)
        )
      })

      for (const p of pastPregs) {
        const delivery = await db.query.deliveries.findFirst({
          where: eq(deliveries.pregnancyId, p.id)
        })

        if (delivery) {
          const yearVal = new Date(delivery.deliveryDate).getFullYear()
          const durationVal = p.gestationalAge || 40

          const existing = await db.query.previousPregnancies.findFirst({
            where: and(
              eq(previousPregnancies.userId, mother.id),
              eq(previousPregnancies.year, yearVal),
              eq(previousPregnancies.modeOfDelivery, delivery.modeOfDelivery || '')
            )
          })

          if (!existing) {
            const childRecord = await db.query.children.findFirst({
              where: eq(children.pregnancyId, p.id)
            })

            const sexVal = childRecord?.sex || 'Unknown'
            const weightVal = childRecord?.birthWeight ? childRecord.birthWeight.toString() : '3.00'
            const complicationsVal = delivery.maternalComplications || delivery.neonatalComplications || 'None'

            await db.insert(previousPregnancies).values({
              userId: mother.id,
              year: yearVal,
              pregnancyDuration: durationVal,
              modeOfDelivery: delivery.modeOfDelivery || 'SVD',
              birthWeight: weightVal,
              sex: sexVal,
              alive: true,
              complications: complicationsVal
            })
          }
        }
      }
    } catch (err) {
      console.error('Error auto-filling previous pregnancies history:', err)
    }
  }

  const prevPregnancies = mother
    ? await safeQuery('previousPregnancies', () =>
        db.query.previousPregnancies.findMany({
          where: eq(previousPregnancies.userId, mother.id),
          orderBy: [desc(previousPregnancies.year)],
        }),
        [])
    : []

  const ancVisits = await safeQuery('ancVisits', () =>
    db.query.appointments.findMany({
      where: eq(appointments.pregnancyId, pregnancyId),
      orderBy: [desc(appointments.scheduledDate)],
    }),
    [])

  const vitals = await safeQuery('vitals', () =>
    db.query.vitalSigns.findMany({
      where: eq(vitalSigns.pregnancyId, pregnancyId),
      orderBy: [desc(vitalSigns.recordedDate)],
      limit: 50,
    }),
    [])

  const labs = await safeQuery('labs', () =>
    db.query.labTests.findMany({
      where: eq(labTests.pregnancyId, pregnancyId),
      orderBy: [desc(labTests.resultDate)],
    }),
    [])

  const deliveryRecord = await safeQuery('delivery', () =>
    db.query.deliveries.findFirst({ where: eq(deliveries.pregnancyId, pregnancyId) }),
    null
  )

  const pncRecords = await safeQuery('postnatalCare', () =>
    db.query.postnatalCare.findMany({
      where: eq(postnatalCare.pregnancyId, pregnancyId),
      orderBy: [desc(postnatalCare.visitDate)],
    }),
    [])

  const childRecords = await safeQuery('children', () =>
    db.query.children.findMany({ where: eq(children.pregnancyId, pregnancyId) }),
    [])

  const childId = childRecords[0]?.id
  let immunizationsData: (typeof immunizations.$inferSelect)[] = []
  let growthData: (typeof childGrowth.$inferSelect)[] = []

  if (childId) {
    immunizationsData = await safeQuery('immunizations', () =>
      db.query.immunizations.findMany({
        where: eq(immunizations.childId, childId),
        orderBy: [asc(immunizations.createdAt)],
      }),
      [])

    growthData = await safeQuery('growth', () =>
      db.query.childGrowth.findMany({
        where: eq(childGrowth.childId, childId),
        orderBy: [asc(childGrowth.recordDate)],
      }),
      [])
  }

  return {
    pregnancy,
    mother: mother ?? null,
    hospital: hospital ?? null,
    previousPregnancies: prevPregnancies,
    ancVisits,
    vitals,
    labs,
    delivery: deliveryRecord ?? null,
    postnatalCare: pncRecords,
    children: childRecords,
    immunizations: immunizationsData,
    growth: growthData,
  }
}

export async function getMCHBookDataForPregnantWoman(clerkId: string, pregnancyId?: string) {
  await ensureMCHSchema()

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  })

  if (!dbUser) return { dbUser: null, book: null as MCHBookData | null }

  let pregnancy: any = null
  if (pregnancyId) {
    pregnancy = await db.query.pregnancies.findFirst({
      where: and(eq(pregnancies.userId, dbUser.id), eq(pregnancies.id, pregnancyId)),
    })
  } else {
    pregnancy = await db.query.pregnancies.findFirst({
      where: and(eq(pregnancies.userId, dbUser.id), eq(pregnancies.status, 'active')),
      orderBy: [desc(pregnancies.createdAt)],
    })

    if (!pregnancy) {
      pregnancy = await db.query.pregnancies.findFirst({
        where: eq(pregnancies.userId, dbUser.id),
        orderBy: [desc(pregnancies.createdAt)],
      })
    }
  }

  if (!pregnancy) return { dbUser, book: null as MCHBookData | null }

  const book = await getMCHBookDataByPregnancyId(pregnancy.id)
  return { dbUser, book }
}

export function serializeMCHBookData(data: MCHBookData) {
  return JSON.parse(JSON.stringify(data))
}
