'use server'

import { db } from '@/lib/db'
import { users, pregnancies, appointments, labTests, partnerAccess, messages, User, NewUser, NewPregnancy, NewMessage, hospitals, vitalSigns, previousPregnancies, deliveries, postnatalCare, children, immunizations, childGrowth, hospitalInvites, partnershipRequests, notifications, staffLoginLogs, hospitalCareEncounters } from '@/lib/db/schema'
import {
  recordFacilityCareEvent,
  getHospitalCareHistory,
  getCareHistoryFacilitySummary,
  getFacilityCareHistory,
} from '@/lib/hospital-care-history'
import { currentUser, clerkClient } from '@clerk/nextjs/server'
import { HospitalDashboardData, DashboardData, Message } from '@/types'
import { eq, desc, asc, and, or, sql, ilike, inArray, gte, lt, ne } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { notifyPregnancyUpdate } from '@/lib/pusher-notify'
import { notifyPatientForPregnancy } from '@/lib/patient-notifications'
import { pusherServer } from '@/lib/pusher-server'
import { ensureMCHSchema } from '@/lib/db/ensure-mch-schema'

function parseIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = parseInt(String(value), 10)
  return Number.isFinite(n) ? n : null
}

function parseDecimalOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  return String(value)
}

export type PatientRecommendationItem = {
  title: string
  content: string
  source: 'clinic_visit' | 'medication' | 'standing_advice' | 'education'
  date?: string
}

function buildPatientRecommendationsList({
  pregnancy,
  visitRecommendations,
}: {
  pregnancy: any
  visitRecommendations: { title: string; content: string; date?: string }[]
}): PatientRecommendationItem[] {
  const items: PatientRecommendationItem[] = []
  const mch = (pregnancy.mchData as Record<string, unknown>) || {}

  const standing = mch.standingAdvice as string | undefined
  if (standing?.trim()) {
    items.push({
      title: 'Advice from your care team',
      content: standing.trim(),
      source: 'standing_advice',
    })
  }

  for (const v of visitRecommendations.slice(0, 5)) {
    items.push({
      title: v.title,
      content: v.content,
      source: 'clinic_visit',
      date: v.date,
    })
  }

  const meds = pregnancy.medications as string[] | null | undefined
  if (meds?.length) {
    items.push({
      title: 'Medications prescribed by clinic',
      content: meds.join(' · '),
      source: 'medication',
    })
  }

  return items
}

function calcGestationalAgeWeeks(lmp: Date | string | null | undefined): number {
  if (!lmp) return 0
  const lmpDate = new Date(lmp)
  if (Number.isNaN(lmpDate.getTime())) return 0
  const diffMs = Date.now() - lmpDate.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7)))
}

function revalidatePregnancyPaths(pregnancyId: string) {
  revalidatePath('/dashboard/pregnant-woman')
  revalidatePath('/dashboard/pregnant-woman/digital-mch-book')
  revalidatePath('/dashboard/father/mch-book')
  revalidatePath('/dashboard/father')
  revalidatePath('/dashboard/hospital')
  revalidatePath('/dashboard/midwife')
  revalidatePath(`/dashboard/hospital/patients/${pregnancyId}`)
  revalidatePath(`/dashboard/hospital/patients/${pregnancyId}/mch-book`)
}

function dateOfBirthFromAge(ageYears: number): Date {
  const dob = new Date()
  dob.setHours(12, 0, 0, 0)
  dob.setFullYear(dob.getFullYear() - ageYears)
  return dob
}

async function requireClinicalStaff() {
  const user = await currentUser()
  if (!user) throw new Error('Unauthorized')

  let dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id),
  })

  // Self-healing fallback: match by email address
  if (!dbUser && user.emailAddresses?.[0]?.emailAddress) {
    const primaryEmail = user.emailAddresses[0].emailAddress.trim().toLowerCase()
    dbUser = await db.query.users.findFirst({
      where: eq(users.email, primaryEmail),
    })

    if (dbUser) {
      console.log(`[requireClinicalStaff] SELF-HEALING: Matching pre-registered user ${dbUser.id} to clerkId ${user.id}`)
      await db.update(users)
        .set({
          clerkId: user.id,
          isVerified: true,
          firstName: user.firstName || dbUser.firstName,
          lastName: user.lastName || dbUser.lastName,
          updatedAt: new Date(),
        })
        .where(eq(users.id, dbUser.id))
      
      // Fetch the freshly updated user record
      dbUser = await db.query.users.findFirst({
        where: eq(users.clerkId, user.id),
      })
    }
  }

  if (
    !dbUser ||
    (dbUser.role !== 'midwife' && dbUser.role !== 'hospital_staff' && dbUser.role !== 'admin')
  ) {
    throw new Error('Not authorized')
  }

  return { user, dbUser }
}

/**
 * Get data for the Patient (Pregnant Woman) Dashboard
 */
export async function getPatientDashboardData(): Promise<DashboardData | null> {
  try {
    await ensureMCHSchema()
    const user = await currentUser()
    if (!user) throw new Error('Unauthorized')

    // Get user from our database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, user.id),
    })

    if (!dbUser) return null

    // Get active pregnancy
    let pregnancy: any = null
    try {
      pregnancy = await db.query.pregnancies.findFirst({
        where: and(
          eq(pregnancies.userId, dbUser.id),
          eq(pregnancies.status, 'active')
        )
      })
    } catch (e) {
      console.error('Error fetching active pregnancy:', e)
    }

    if (!pregnancy) {
      // No active pregnancy — fetch completed ones so history is visible
      let pastPregnancies: any[] = []
      try {
        const completed = await db.query.pregnancies.findMany({
          where: eq(pregnancies.userId, dbUser.id),
          orderBy: [desc(pregnancies.createdAt)],
        })
        for (const p of completed) {
          const pHospital = await db.query.hospitals.findFirst({ where: eq(hospitals.id, p.hospitalId) }).catch(() => null)
          const pDelivery = await db.query.deliveries.findFirst({ where: eq(deliveries.pregnancyId, p.id) }).catch(() => null)
          const pChild = await db.query.children.findFirst({ where: eq(children.pregnancyId, p.id) }).catch(() => null)
          const pAncCount = await db.query.appointments.findMany({ where: and(eq(appointments.pregnancyId, p.id), eq(appointments.status, 'completed')) }).catch(() => [])
          pastPregnancies.push({ ...p, hospital: pHospital || null, delivery: pDelivery || null, child: pChild || null, ancVisitCount: pAncCount.length })
        }
      } catch (e) {
        console.error('Error fetching past pregnancies:', e)
      }
      return JSON.parse(JSON.stringify({ user: dbUser, pregnancy: null, appointments: [], labs: [], vitals: [], pastPregnancies }))
    }

    // Fetch hospital separately to avoid Drizzle relation dependencies
    let hospital: any = null
    try {
      hospital = await db.query.hospitals.findFirst({
        where: eq(hospitals.id, pregnancy.hospitalId)
      })
    } catch (e) {
      console.error('Error fetching pregnancy hospital:', e)
    }

    const pregnancyWithHospital = {
      ...pregnancy,
      hospital: hospital || null
    }

    // Get recent vitals
    let recentVitals: any[] = []
    try {
      recentVitals = await db.query.vitalSigns.findMany({
        where: eq(vitalSigns.pregnancyId, pregnancy.id),
        orderBy: [desc(vitalSigns.recordedDate)],
        limit: 30,
      })
    } catch (e) {
      console.error('Error fetching recent vitals:', e)
    }

    // Get upcoming scheduled visits (nearest first)
    let upcomingAppointments: any[] = []
    try {
      upcomingAppointments = await db.query.appointments.findMany({
        where: and(
          eq(appointments.pregnancyId, pregnancy.id),
          eq(appointments.status, 'scheduled'),
          sql`${appointments.scheduledDate} >= NOW()`
        ),
        orderBy: [asc(appointments.scheduledDate)],
        limit: 10,
      })
    } catch (e) {
      console.error('Error fetching upcoming appointments:', e)
    }

    let careContact: typeof users.$inferSelect | null = null
    if (pregnancy.midwifeId) {
      try {
        careContact = await db.query.users.findFirst({
          where: eq(users.id, pregnancy.midwifeId),
        }) ?? null
      } catch (e) {
        console.error('Error fetching care contact:', e)
      }
    }

    // Get recent lab results
    let recentLabs: any[] = []
    try {
      recentLabs = await db.query.labTests.findMany({
        where: eq(labTests.pregnancyId, pregnancy.id),
        orderBy: [desc(labTests.resultDate)],
        limit: 15,
      })
    } catch (e) {
      console.error('Error fetching recent lab tests:', e)
    }

    let patientNotifications: any[] = []
    try {
      patientNotifications = await db.query.notifications.findMany({
        where: eq(notifications.userId, dbUser.id),
        orderBy: [desc(notifications.createdAt)],
        limit: 30,
      })
    } catch (e) {
      console.error('Error fetching notifications:', e)
    }

    const ga =
      pregnancy.gestationalAge ?? calcGestationalAgeWeeks(pregnancy.lmp)

    let visitRecommendations: { title: string; content: string; date?: string }[] = []
    try {
      const completedVisits = await db.query.appointments.findMany({
        where: and(
          eq(appointments.pregnancyId, pregnancy.id),
          eq(appointments.status, 'completed')
        ),
        orderBy: [desc(appointments.scheduledDate)],
        limit: 15,
      })
      visitRecommendations = completedVisits
        .filter((v) => v.recommendations?.trim())
        .map((v) => ({
          title: 'Clinic visit advice',
          content: v.recommendations!.trim(),
          date: v.scheduledDate
            ? new Date(v.scheduledDate).toLocaleDateString()
            : undefined,
        }))
    } catch (e) {
      console.error('Error fetching visit recommendations:', e)
    }

    const clinicRecommendations = buildPatientRecommendationsList({
      pregnancy: { ...pregnancy, gestationalAge: ga },
      visitRecommendations,
    })

    let careHistory: Awaited<ReturnType<typeof getHospitalCareHistory>> = []
    let careFacilitySummary: Awaited<ReturnType<typeof getCareHistoryFacilitySummary>> = []
    try {
      careHistory = await getHospitalCareHistory(pregnancy.id, 30)
      careFacilitySummary = await getCareHistoryFacilitySummary(pregnancy.id)
    } catch (e) {
      console.error('Error fetching care history:', e)
    }

    let linkedPartner: {
      email: string
      firstName: string
      lastName: string
      accessActive: boolean
    } | null = null
    try {
      const access = await db.query.partnerAccess.findFirst({
        where: eq(partnerAccess.pregnantWomanId, dbUser.id),
      })
      if (access) {
        const partner = await db.query.users.findFirst({
          where: eq(users.id, access.partnerId),
        })
        if (partner) {
          linkedPartner = {
            email: partner.email,
            firstName: partner.firstName,
            lastName: partner.lastName,
            accessActive: !!access.isActive,
          }
        }
      }
    } catch (e) {
      console.error('Error fetching linked partner:', e)
    }

    let pastPregnancies: any[] = []
    try {
      const allPregs = await db.query.pregnancies.findMany({
        where: and(eq(pregnancies.userId, dbUser.id), ne(pregnancies.id, pregnancy.id)),
        orderBy: [desc(pregnancies.createdAt)],
      })
      for (const p of allPregs) {
        const pH = await db.query.hospitals.findFirst({ where: eq(hospitals.id, p.hospitalId) }).catch(() => null)
        const pD = await db.query.deliveries.findFirst({ where: eq(deliveries.pregnancyId, p.id) }).catch(() => null)
        const pC = await db.query.children.findFirst({ where: eq(children.pregnancyId, p.id) }).catch(() => null)
        const pA = await db.query.appointments.findMany({ where: and(eq(appointments.pregnancyId, p.id), eq(appointments.status, 'completed')) }).catch(() => [])
        pastPregnancies.push({ ...p, hospital: pH || null, delivery: pD || null, child: pC || null, ancVisitCount: pA.length })
      }
    } catch (e) {
      console.error('Error fetching past pregnancies:', e)
    }

    return {
      user: dbUser,
      pregnancy: {
        ...pregnancyWithHospital,
        gestationalAge: ga,
      },
      appointments: upcomingAppointments,
      labs: recentLabs,
      vitals: recentVitals,
      careContact,
      notifications: patientNotifications,
      clinicRecommendations,
      careHistory,
      careFacilitySummary,
      linkedPartner,
      pastPregnancies,
    }
  } catch (err) {
    console.error('CRITICAL ERROR in getPatientDashboardData:', err)
    // Safe graceful fallback to prevent rendering error
    return null
  }
}

/**
 * Get data for the Hospital Dashboard
 */
export async function getHospitalDashboardData(): Promise<HospitalDashboardData | null> {
  try {
    const user = await currentUser()
    if (!user) {
      console.log('getHospitalDashboardData: No user found')
      return null
    }

    // Get user and verify hospital_staff role
    let dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, user.id),
    })

    // Self-healing fallback: match by email address
    if (!dbUser && user.emailAddresses?.[0]?.emailAddress) {
      const primaryEmail = user.emailAddresses[0].emailAddress.trim().toLowerCase()
      dbUser = await db.query.users.findFirst({
        where: eq(users.email, primaryEmail),
      })

      if (dbUser) {
        console.log(`[getHospitalDashboardData] SELF-HEALING: Matching pre-registered user ${dbUser.id} to clerkId ${user.id}`)
        await db.update(users)
          .set({
            clerkId: user.id,
            isVerified: true,
            firstName: user.firstName || dbUser.firstName,
            lastName: user.lastName || dbUser.lastName,
            updatedAt: new Date(),
          })
          .where(eq(users.id, dbUser.id))
        
        // Fetch the freshly updated user record
        dbUser = await db.query.users.findFirst({
          where: eq(users.clerkId, user.id),
        })
      }
    }

    if (!dbUser) {
      console.log(`getHospitalDashboardData: No dbUser found for ${user.id}`)
      return null
    }
    
    if (dbUser.role !== 'hospital_staff' && dbUser.role !== 'admin' && dbUser.role !== 'midwife') {
      console.warn(`Unauthorized role access attempt to hospital dashboard by ${user.id}, role is ${dbUser.role}`)
      return null
    }

    // SAFE GUARD: If hospital staff has no hospitalId yet, return a minimal
    // pending state that signals to the server page to redirect to /onboarding/hospital
    // instead of crashing the Drizzle query with eq(column, null).
    if (!dbUser.hospitalId) {
      console.warn(`getHospitalDashboardData: User ${user.id} has role ${dbUser.role} but no hospitalId. Returning pending setup state.`)
      return JSON.parse(JSON.stringify({
        hospital: { name: 'Pending Setup', id: null },
        patients: [],
        pregnancies: [],
        appointments: [],
      }))
    }

    // Active pregnancies at this hospital
    const activePregnanciesRaw = await db.query.pregnancies.findMany({
      where: and(
        eq(pregnancies.status, 'active'),
        eq(pregnancies.hospitalId, dbUser.hospitalId)
      ),
      limit: 50,
    })

    const patientUserIds = [...new Set(activePregnanciesRaw.map((p) => p.userId))]
    const patientsForPregnancies =
      patientUserIds.length > 0
        ? await db.query.users.findMany({
            where: inArray(users.id, patientUserIds),
          })
        : []
    const patientById = new Map(patientsForPregnancies.map((u) => [u.id, u]))

    const activePregnancies = await Promise.all(
      activePregnanciesRaw.map(async (p) => {
        const patient = patientById.get(p.userId)
        const nextAppt = await db.query.appointments.findFirst({
          where: and(
            eq(appointments.pregnancyId, p.id),
            eq(appointments.status, 'scheduled'),
            sql`${appointments.scheduledDate} >= NOW()`
          ),
          orderBy: [asc(appointments.scheduledDate)],
        })

        let assignedStaffName: string | null = null
        if (p.midwifeId) {
          const staff = await db.query.users.findFirst({
            where: eq(users.id, p.midwifeId),
          })
          if (staff) {
            assignedStaffName = `${staff.firstName} ${staff.lastName}`.trim()
          }
        }

        const ga = p.gestationalAge ?? calcGestationalAgeWeeks(p.lmp)

        return {
          ...p,
          patientUserId: p.userId,
          patientName: patient
            ? `${patient.firstName} ${patient.lastName}`.trim() || patient.email
            : 'Unknown Patient',
          patientPhone: patient?.phone ?? null,
          patientEmail: patient?.email ?? null,
          gestationalAge: ga,
          nextVisit: nextAppt
            ? new Date(nextAppt.scheduledDate).toLocaleDateString()
            : 'Not scheduled',
          nextVisitDate: nextAppt?.scheduledDate ?? null,
          nextVisitId: nextAppt?.id ?? null,
          assignedStaffId: p.midwifeId,
          assignedStaffName,
          riskLevel: p.riskFactors?.length ? 'high' : 'low',
        }
      })
    )

    const byHospitalId = await db.query.users.findMany({
      where: and(
        eq(users.role, 'pregnant_woman'),
        eq(users.hospitalId, dbUser.hospitalId)
      ),
      limit: 50,
    })
    const allPatientsMap = new Map<string, (typeof patientsForPregnancies)[0]>()
    ;[...byHospitalId, ...patientsForPregnancies].forEach((u) => allPatientsMap.set(u.id, u))
    const allPatients = Array.from(allPatientsMap.values())

    const careStaff = await db.query.users.findMany({
      where: and(
        eq(users.hospitalId, dbUser.hospitalId),
        or(eq(users.role, 'midwife'), eq(users.role, 'hospital_staff'))
      ),
    })

    const todayAppointments = await db.query.appointments.findMany({
      where: and(
        sql`DATE(${appointments.scheduledDate}) = CURRENT_DATE`,
        eq(appointments.hospitalId, dbUser.hospitalId)
      ),
      limit: 20,
    })

    const upcomingHospitalAppointments = await db.query.appointments.findMany({
      where: and(
        eq(appointments.hospitalId, dbUser.hospitalId),
        eq(appointments.status, 'scheduled'),
        sql`${appointments.scheduledDate} >= NOW()`
      ),
      orderBy: [asc(appointments.scheduledDate)],
      limit: 50,
    })

    const enrichedAppointments = await Promise.all(
      upcomingHospitalAppointments.map(async (apt) => {
        const preg = activePregnancies.find((p) => p.id === apt.pregnancyId)
        return {
          ...apt,
          patientName: preg?.patientName ?? 'Patient',
          patientUserId: preg?.patientUserId,
        }
      })
    )

    // Get hospital details
    const hospital = await db.query.hospitals.findFirst({
      where: eq(hospitals.id, dbUser.hospitalId)
    })

    const messageThreads = await getHospitalMessageThreads()
    const facilityCareHistory = await getFacilityCareHistory(dbUser.hospitalId, 50)

    return JSON.parse(JSON.stringify({
      hospital,
      patients: allPatients,
      pregnancies: activePregnancies,
      careStaff,
      appointments: todayAppointments,
      upcomingAppointments: enrichedAppointments,
      messageThreads,
      dbUser,
      facilityCareHistory,
    }))
  } catch (error) {
    console.error('Error in getHospitalDashboardData:', error)
    return null
  }
}

/**
 * Get data for the Midwife Dashboard
 */
export async function getMidwifeDashboardData() {
  try {
    const user = await currentUser()
    if (!user) return null

    // Get midwife record
    let dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, user.id),
    })

    // Self-healing fallback: match by email address
    if (!dbUser && user.emailAddresses?.[0]?.emailAddress) {
      const primaryEmail = user.emailAddresses[0].emailAddress.trim().toLowerCase()
      dbUser = await db.query.users.findFirst({
        where: eq(users.email, primaryEmail),
      })

      if (dbUser) {
        console.log(`[getMidwifeDashboardData] SELF-HEALING: Matching pre-registered user ${dbUser.id} to clerkId ${user.id}`)
        await db.update(users)
          .set({
            clerkId: user.id,
            isVerified: true,
            firstName: user.firstName || dbUser.firstName,
            lastName: user.lastName || dbUser.lastName,
            updatedAt: new Date(),
          })
          .where(eq(users.id, dbUser.id))
        
        // Fetch the freshly updated user record
        dbUser = await db.query.users.findFirst({
          where: eq(users.clerkId, user.id),
        })
      }
    }

    // Allow midwife or hospital_staff (doctors/nurses) or admin
    if (!dbUser || (dbUser.role !== 'midwife' && dbUser.role !== 'hospital_staff' && dbUser.role !== 'admin')) {
      console.warn(`[getMidwifeDashboardData] Unexpected role: ${dbUser?.role} for user ${user?.id}`)
      return null
    }

    // Get hospital details
    const hospital = dbUser.hospitalId
      ? await db.query.hospitals.findFirst({ where: eq(hospitals.id, dbUser.hospitalId) })
      : null

    // Get active pregnancies at this midwife's hospital or assigned to this midwife
    const activePregnanciesRaw = dbUser.hospitalId
      ? await db.query.pregnancies.findMany({
          where: and(
            eq(pregnancies.status, 'active'),
            or(
              eq(pregnancies.hospitalId, dbUser.hospitalId),
              eq(pregnancies.midwifeId, dbUser.id)
            )
          ),
        })
      : []

    const patientUserIds = [...new Set(activePregnanciesRaw.map((p) => p.userId))]
    const patientUsers =
      patientUserIds.length > 0
        ? await db.query.users.findMany({
            where: inArray(users.id, patientUserIds),
          })
        : []

    const patientById = new Map(patientUsers.map((u) => [u.id, u]))

    const patients = activePregnanciesRaw.map((p) => {
      const u = patientById.get(p.userId)
      const ga = p.gestationalAge ?? calcGestationalAgeWeeks(p.lmp)
      return {
        id: u?.id || p.userId,
        firstName: u?.firstName || 'Unknown',
        lastName: u?.lastName || 'Patient',
        email: u?.email || '',
        phone: u?.phone || '',
        isActive: u?.isActive ?? true,
        pregnancyId: p.id,
        hospitalId: p.hospitalId,
        gestationalAge: ga,
        riskLevel: p.riskFactors?.length ? 'High Risk' : 'Low Risk',
        assignedMidwifeId: p.midwifeId,
      }
    })

    return JSON.parse(JSON.stringify({
      midwife: dbUser,
      patients,
      hospital,
    }))
  } catch (error) {
    console.error('[getMidwifeDashboardData] Error:', error)
    return null
  }
}


/**
 * Get data for the Father Dashboard (read-only for partners on mother's account)
 */
export async function getFatherDashboardData() {
  const user = await currentUser()
  if (!user) throw new Error('Unauthorized')

  let dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id),
  })

  // 1. If not found by Clerk ID, try self-healing fallback by matching email address
  if (!dbUser && user.emailAddresses?.[0]?.emailAddress) {
    const primaryEmail = user.emailAddresses[0].emailAddress.trim().toLowerCase()
    dbUser = await db.query.users.findFirst({
      where: eq(users.email, primaryEmail),
    })

    if (dbUser) {
      console.log(`[getFatherDashboardData] SELF-HEALING: Matching pre-registered user ${dbUser.id} to clerkId ${user.id}`)
      await db.update(users)
        .set({
          clerkId: user.id,
          isVerified: true,
          firstName: user.firstName || dbUser.firstName,
          lastName: user.lastName || dbUser.lastName,
          updatedAt: new Date(),
        })
        .where(eq(users.id, dbUser.id))
    }
  }

  // 2. If STILL not found (e.g. direct sign-up without mother onboarding), provision a safe user record dynamically
  if (!dbUser) {
    const primaryEmail = user.emailAddresses?.[0]?.emailAddress?.trim().toLowerCase() || `father-${user.id.substring(0, 8)}@maternalcare.com`
    console.log(`[getFatherDashboardData] Fallback: Provisioning new user record for clerkId ${user.id} (${primaryEmail})`)
    const [newPartner] = await db.insert(users).values({
      clerkId: user.id,
      email: primaryEmail,
      firstName: user.firstName || 'User',
      lastName: user.lastName || '',
      role: 'father',
      isVerified: true,
      isActive: true,
    }).returning()
    dbUser = newPartner
  }

  let pregnancy: (typeof pregnancies.$inferSelect) | null = null
  let motherUser: (typeof users.$inferSelect) | null = null
  if (dbUser.role === 'father' || dbUser.role === 'admin') {
    const access = await db.query.partnerAccess.findFirst({
      where: and(
        eq(partnerAccess.partnerId, dbUser.id),
        eq(partnerAccess.isActive, true)
      ),
    })
    if (access?.pregnancyId) {
      pregnancy = await db.query.pregnancies.findFirst({
        where: eq(pregnancies.id, access.pregnancyId),
      }) || null
      if (pregnancy?.userId) {
        motherUser = await db.query.users.findFirst({
          where: eq(users.id, pregnancy.userId),
        }) || null
      }
    }
  }

  // Get upcoming scheduled appointments
  const upcomingAppointments = pregnancy?.id ? await db.query.appointments.findMany({
    where: and(
      eq(appointments.pregnancyId, pregnancy.id),
      eq(appointments.status, 'scheduled'),
      gte(appointments.scheduledDate, new Date(new Date().setHours(0, 0, 0, 0)))
    ),
    orderBy: [asc(appointments.scheduledDate)],
    limit: 5,
  }) : []

  // Get lab results (User requested fathers see all)
  const labs = pregnancy?.id ? await db.query.labTests.findMany({
    where: eq(labTests.pregnancyId, pregnancy.id),
    orderBy: [desc(labTests.resultDate)],
    limit: 10
  }) : []

  let hospital: typeof hospitals.$inferSelect | null = null
  if (pregnancy?.hospitalId) {
    hospital =
      (await db.query.hospitals.findFirst({
        where: eq(hospitals.id, pregnancy.hospitalId),
      })) ?? null
  }

  const ga = pregnancy
    ? pregnancy.gestationalAge ?? calcGestationalAgeWeeks(pregnancy.lmp)
    : 0

  let visitRecommendations: { title: string; content: string; date?: string }[] = []
  if (pregnancy?.id) {
    const completedVisits = await db.query.appointments.findMany({
      where: and(
        eq(appointments.pregnancyId, pregnancy.id),
        eq(appointments.status, 'completed')
      ),
      orderBy: [desc(appointments.scheduledDate)],
      limit: 10,
    })
    visitRecommendations = completedVisits
      .filter((v) => v.recommendations?.trim())
      .map((v) => ({
        title: 'Clinic visit advice',
        content: v.recommendations!.trim(),
        date: v.scheduledDate
          ? new Date(v.scheduledDate).toLocaleDateString()
          : undefined,
      }))
  }

  const clinicRecommendations = pregnancy
    ? buildPatientRecommendationsList({
        pregnancy: { ...pregnancy, gestationalAge: ga },
        visitRecommendations,
      })
    : []

  let pendingVerification = false
  if ((dbUser.role === 'father') && !pregnancy) {
    const pending = await db.query.partnerAccess.findFirst({
      where: eq(partnerAccess.partnerId, dbUser.id),
    })
    pendingVerification = !!pending && !pending.isActive
  }

  // --- START REAL-TIME VITALS COMPILATION ---
  const completedCheckups = pregnancy?.id ? await db.query.appointments.findMany({
    where: and(
      eq(appointments.pregnancyId, pregnancy.id),
      eq(appointments.status, 'completed')
    ),
    orderBy: [asc(appointments.actualDate)],
  }) : []

  const directVitals = pregnancy?.id ? await db.query.vitalSigns.findMany({
    where: eq(vitalSigns.pregnancyId, pregnancy.id),
    orderBy: [asc(vitalSigns.recordedDate)],
  }) : []

  const weightHistory: { week: number; weight: number; date: string }[] = []
  const bpHistory: { date: string; systolic: number; diastolic: number }[] = []
  const fhrHistory: { date: string; fhr: number }[] = []

  let latestWeight: number | null = null
  let latestBloodPressure: string | null = null
  let latestFetalHeartRate: number | null = null
  let lastRecordedDate: string | null = null

  // 1. Compile completed checkups
  for (const c of completedCheckups) {
    const dateStr = c.actualDate ? new Date(c.actualDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Clinic Visit'
    
    if (c.weight) {
      const w = parseFloat(c.weight.toString())
      weightHistory.push({
        week: c.gestationalAge || 0,
        weight: w,
        date: dateStr,
      })
      latestWeight = w
      if (c.actualDate) lastRecordedDate = dateStr
    }
    if (c.bloodPressure) {
      latestBloodPressure = c.bloodPressure
      const bpParts = c.bloodPressure.split('/')
      if (bpParts.length === 2) {
        bpHistory.push({
          date: dateStr,
          systolic: parseInt(bpParts[0]) || 120,
          diastolic: parseInt(bpParts[1]) || 80,
        })
      }
      if (c.actualDate) lastRecordedDate = dateStr
    }
    if (c.fetalHeartRate) {
      fhrHistory.push({
        date: dateStr,
        fhr: c.fetalHeartRate,
      })
      latestFetalHeartRate = c.fetalHeartRate
      if (c.actualDate) lastRecordedDate = dateStr
    }
  }

  // 2. Compile direct vital signs logs
  for (const v of directVitals) {
    const dateStr = v.recordedDate ? new Date(v.recordedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Vitals Log'
    
    let estWeek = 0
    if (pregnancy?.lmp && v.recordedDate) {
      const diffMs = new Date(v.recordedDate).getTime() - new Date(pregnancy.lmp).getTime()
      estWeek = Math.max(0, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)))
    }

    if (v.weight) {
      const w = parseFloat(v.weight.toString())
      weightHistory.push({
        week: estWeek,
        weight: w,
        date: dateStr,
      })
      latestWeight = w
      if (v.recordedDate) lastRecordedDate = dateStr
    }
    if (v.bloodPressureSystolic && v.bloodPressureDiastolic) {
      latestBloodPressure = `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`
      bpHistory.push({
        date: dateStr,
        systolic: v.bloodPressureSystolic,
        diastolic: v.bloodPressureDiastolic,
      })
      if (v.recordedDate) lastRecordedDate = dateStr
    }
  }

  // Sort weight history chronologically by gestational week
  weightHistory.sort((a, b) => a.week - b.week)

  // Use pre-pregnancy weight as fallback if history is empty
  if (weightHistory.length === 0 && pregnancy?.prePregnancyWeight) {
    const w = parseFloat(pregnancy.prePregnancyWeight.toString())
    weightHistory.push({ week: 4, weight: w, date: 'Baseline' })
    latestWeight = w
  }
  // --- END REAL-TIME VITALS COMPILATION ---

  return JSON.parse(
    JSON.stringify({
      user: dbUser,
      pregnancy: pregnancy ? { ...pregnancy, gestationalAge: ga, hospital } : null,
      motherUser,
      appointments: upcomingAppointments,
      labs,
      clinicRecommendations,
      readOnly: dbUser.role === 'father',
      pendingVerification,
      vitals: {
        weightHistory,
        bpHistory,
        fhrHistory,
        latestWeight,
        latestBloodPressure,
        latestFetalHeartRate,
        lastRecordedDate,
      }
    })
  )
}

/**
 * Get data for the Admin Dashboard
 */
export async function getAdminDashboardData() {
  const user = await currentUser()
  if (!user) throw new Error('Unauthorized')

  // Get admin record
  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id),
  })

  if (!dbUser || dbUser.role !== 'admin') {
    throw new Error('Unauthorized role')
  }

  // Get all users
  const allUsers = await db.query.users.findMany({
    orderBy: [desc(users.createdAt)],
    limit: 100,
  })

  // Get all hospitals
  const allHospitals = await db.query.hospitals.findMany({
    orderBy: [desc(hospitals.name)],
  })

  // Get total counts
  const rawUserCounts = await db.select({
    role: users.role,
    count: sql`count(*)`,
  }).from(users).groupBy(users.role)

  const userCounts = rawUserCounts.map((uc) => ({
    role: uc.role || 'unknown',
    count: Number(uc.count),
  }))

  // Get all hospital invites
  const allInvites = await db.query.hospitalInvites.findMany({
    orderBy: [desc(hospitalInvites.sentAt)],
  })

  // Get all partnership requests
  const allPartnershipRequests = await db.query.partnershipRequests.findMany({
    orderBy: [desc(partnershipRequests.createdAt)],
  })

  return JSON.parse(JSON.stringify({
    user: dbUser,
    allUsers,
    allHospitals,
    allInvites,
    userCounts,
    allPartnershipRequests,
  }))
}

/**
 * Fetch real-time data for the Admin Database Explorer
 */
export async function getAdminDatabaseTableData(tableName: string) {
  try {
    const user = await currentUser()
    if (!user) throw new Error('Unauthorized')

    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, user.id),
    })

    if (!dbUser || dbUser.role !== 'admin') {
      throw new Error('Unauthorized role')
    }

    // Dynamic imports for tables not imported at the file-level top to keep imports clean
    const { mandatoryLabTests: mandatoryTestsTable, educationalResources: eduTable } = await import('@/lib/db/schema')

    // Whitelist mapping of all Neon tables for stakeholders
    const tableMapping: Record<string, any> = {
      users,
      pregnancies,
      appointments,
      lab_tests: labTests,
      messages,
      hospitals,
      vital_signs: vitalSigns,
      previous_pregnancies: previousPregnancies,
      deliveries,
      postnatal_care: postnatalCare,
      children,
      immunizations,
      child_growth: childGrowth,
      hospital_invites: hospitalInvites,
      partnership_requests: partnershipRequests,
      notifications,
      staff_login_logs: staffLoginLogs,
      hospital_care_encounters: hospitalCareEncounters,
      partner_access: partnerAccess,
      educational_resources: eduTable,
      mandatory_lab_tests: mandatoryTestsTable,
    }

    if (tableName === 'pregnant_women') {
      const rows = await db.select().from(users).where(eq(users.role, 'pregnant_woman')).limit(200)
      return { success: true, data: JSON.parse(JSON.stringify(rows)) }
    }

    const schemaTable = tableMapping[tableName]
    if (!schemaTable) {
      throw new Error(`Secure or unrecognized database table: ${tableName}`)
    }

    const rows = await db.select().from(schemaTable).limit(200)
    return { success: true, data: JSON.parse(JSON.stringify(rows)) }
  } catch (error: any) {
    console.error(`Error querying database table ${tableName}:`, error)
    return { success: false, error: error.message }
  }
}


/**
 * Manually assign a user to a hospital
 */
export async function assignUserToHospital(userId: string, hospitalId: string) {
  try {
    // Current user checking
    const curUser = await currentUser()
    if (!curUser) throw new Error('Unauthorized')

    await db.update(users)
      .set({ hospitalId, updatedAt: new Date() })
      .where(eq(users.id, userId))
    
    revalidatePath('/dashboard/admin')
    return { success: true }
  } catch (error) {
    console.error('Assignment error:', error)
    return { success: false, error: 'Failed to assign hospital' }
  }
}

/**
 * Invite a new hospital (Admin Action)
 */
export async function inviteHospital(email: string, hospitalName: string) {
  try {
    const user = await currentUser()
    if (!user) throw new Error('Unauthorized')

    // 1. Verify that the current user is an Admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, user.id)
    })
    if (!dbUser || dbUser.role !== 'admin') {
      throw new Error('Only administrators can invite hospitals')
    }

    // 2. Generate a secure invitation token
    const token = `INV-${Math.random().toString(36).substring(2, 10).toUpperCase()}`

    // 2.5. Send programmatic Clerk Invitation to trigger automatic email delivery
    try {
      const client = await clerkClient()
      const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://maternalcareplus.vercel.app'
      await client.invitations.createInvitation({
        emailAddress: email.trim().toLowerCase(),
        redirectUrl: `${origin}/sign-up`,
        publicMetadata: {
          role: 'hospital_staff',
          hospitalName: hospitalName.trim(),
          token,
        },
        ignoreExisting: true,
      })
      console.log(`[inviteHospital] Programmatic Clerk Invitation successfully sent to ${email}`)
    } catch (clerkErr: any) {
      console.error('[inviteHospital] Warning: Clerk programmatic invitation failed:', clerkErr)
      // We still proceed so the DB record is persisted as a reliable fallback
    }

    // 3. Register the invite in the hospital_invites database table
    await db.insert(hospitalInvites).values({
      email: email.trim().toLowerCase(),
      hospitalName: hospitalName.trim(),
      token,
      status: 'pending',
    })

    // 4. Pre-create the hospital entry so it is registered in the database, marked as not verified
    const hospitalCode = `HSP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    await db.insert(hospitals).values({
      name: hospitalName.trim(),
      code: hospitalCode,
      address: 'Pending Completion of Profile Onboarding',
      region: 'Pending',
      city: 'Pending',
      phone: '0000000000',
      email: email.trim().toLowerCase(),
      type: 'Hospital',
      isVerified: false,
    })

    revalidatePath('/dashboard/admin')
    return { success: true, token }
  } catch (error: any) {
    console.error('Invite hospital error:', error)
    return { success: false, error: error?.message || 'Failed to send invite' }
  }
}

/**
 * Self-healing sync: Manually forces a synchronization of the Clerk user to the Neon database.
 * Use this when webhooks are late or failing.
 */
export async function syncClerkAccount() {
  try {
    const user = await currentUser()
    if (!user) return { success: false, error: 'No authenticated user' }

    const primaryEmail = user.emailAddresses[0]?.emailAddress
    if (!primaryEmail) return { success: false, error: 'No email found in Clerk' }
    const normalizedEmail = primaryEmail.trim().toLowerCase()

    // 1. Check if user exists in DB by Clerk ID
    let dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, user.id)
    })

    // 1.5 If not found by Clerk ID, try by email using case-insensitive search
    // (handles email casing mismatches between hospital pre-registration and Clerk)
    if (!dbUser) {
      dbUser = await db.query.users.findFirst({
        where: ilike(users.email, normalizedEmail)
      })

      if (dbUser) {
        console.log(`Self-healing: Found pre-registered user ${dbUser.id} by email. Linking Clerk ID...`)
        // Update the placeholder clerkId with their real Clerk ID!
        await db.update(users)
          .set({ clerkId: user.id, isVerified: true, email: normalizedEmail })
          .where(eq(users.id, dbUser.id))
      }
    }

    // Prioritize DB role, then Clerk metadata role, then default fallback
    let role = dbUser?.role || (user.publicMetadata?.role as string) || null

    if (!role) {
      role = 'hospital_staff' // Default for first-time provider signups
    }

    if (!dbUser) {
      console.log(`Self-healing: Creating missing user record for ${user.id} with role ${role}`)
      const [insertedUser] = await db.insert(users).values({
        clerkId: user.id,
        email: normalizedEmail,
        firstName: user.firstName || 'User',
        lastName: user.lastName || '',
        role: role as any,
        isVerified: true,
        isActive: true,
      }).returning()
      dbUser = insertedUser
    } else if (dbUser.role !== role) {
       // DB is source of truth, synchronize Clerk metadata if they disagree
       console.log(`Self-healing: Clerk/DB mismatch. Database role is ${dbUser.role}, Clerk is ${role}. Syncing Clerk.`)
       role = dbUser.role
    }

    // Ensure Clerk metadata is up to date
    if (user.publicMetadata?.role !== role) {
      await (await clerkClient()).users.updateUserMetadata(user.id, {
        publicMetadata: { role: role }
      })
    }

    // 2. Hospital staff specific logic: ensure they have a valid invite or a pre-registered hospital
    if (role === 'hospital_staff') {
      // Case-insensitive email lookup for hospital record
      const existingHospital = await db.query.hospitals.findFirst({
        where: ilike(hospitals.email, normalizedEmail)
      })

      // Case-insensitive email lookup for invite record
      const invite = await db.query.hospitalInvites.findFirst({
        where: ilike(hospitalInvites.email, normalizedEmail)
      })

      if (!invite && !existingHospital) {
        // SELF-HEALING: If the user was directly assigned hospital_staff in Clerk
        // by an admin but has no DB record, auto-provision a placeholder hospital for them.
        // This handles the "Method B" direct Clerk creation workflow.
        const clerkMeta = user.publicMetadata as any
        const hospitalName = clerkMeta?.hospitalName || `${user.firstName || ''} ${user.lastName || ''}`.trim() + "'s Hospital" || 'New Hospital'
        
        console.log(`Self-healing: No invite or hospital found for ${normalizedEmail}. Auto-provisioning placeholder hospital: '${hospitalName}'.`)
        
        const hospitalCode = `HSP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
        const [newHospital] = await db.insert(hospitals).values({
          name: hospitalName,
          code: hospitalCode,
          address: 'Pending Setup',
          region: 'Pending',
          city: 'Pending',
          phone: '0000000000',
          email: normalizedEmail,
          type: 'Hospital',
          isVerified: false,
        }).returning()

        // Link the user to the newly provisioned hospital
        if (newHospital && dbUser) {
          await db.update(users)
            .set({ hospitalId: newHospital.id })
            .where(eq(users.clerkId, user.id))
        }
      } else if (existingHospital && dbUser && !dbUser.hospitalId) {
        // Link user to their pre-created hospital record if not yet linked
        await db.update(users)
          .set({ hospitalId: existingHospital.id })
          .where(eq(users.clerkId, user.id))
        console.log(`Self-healing: Linked user ${user.id} to hospital ${existingHospital.id}`)
      }
    }

    // 3. Determine precise target path for redirect
    let targetPath = '/dashboard'
    if (role === 'admin') targetPath = '/dashboard/admin'
    if (role === 'hospital_staff') targetPath = '/dashboard/hospital'
    if (role === 'midwife') targetPath = '/dashboard/hospital'
    if (role === 'pregnant_woman') targetPath = '/dashboard/pregnant-woman'
    if (role === 'father') targetPath = '/dashboard/father'

    revalidatePath('/')
    return { success: true, role, targetPath }
  } catch (err) {
    console.error('Self-healing sync error:', err)
    return { success: false, error: 'Critical sync failure' }
  }
}

/**
 * Onboard a new patient
 */
export async function onboardPatient(formData: any) {
  const user = await currentUser()
  if (!user) throw new Error('Unauthorized')

  // 1. Check permissions
  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id)
  })
  if (!dbUser || (dbUser.role !== 'hospital_staff' && dbUser.role !== 'admin')) {
    throw new Error('Not authorized to add users')
  }

  try {
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://maternalcareplus.vercel.app'
    const emailLower = formData.email.trim().toLowerCase()
    
    // Check if the user is already registered in our database
    let existingUser = await db.query.users.findFirst({
      where: eq(users.email, emailLower)
    })

    let newUser;
    if (existingUser) {
      newUser = existingUser
      // Update their profile details if needed
      const existingDobUpdate: Partial<typeof users.$inferInsert> = {}
      if (formData.dateOfBirth) {
        existingDobUpdate.dateOfBirth = new Date(formData.dateOfBirth)
      } else if (formData.age != null && formData.age !== '') {
        const ageNum = parseInt(String(formData.age), 10)
        if (!Number.isNaN(ageNum) && ageNum >= 10 && ageNum <= 60) {
          existingDobUpdate.dateOfBirth = dateOfBirthFromAge(ageNum)
        }
      }

      await db.update(users)
        .set({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone || existingUser.phone,
          address: formData.address || existingUser.address,
          hospitalId: dbUser.hospitalId || existingUser.hospitalId,
          ghanaCardId: formData.ghanaCardId ? formData.ghanaCardId.trim() : existingUser.ghanaCardId,
          nhisNumber: formData.nhisNumber ? formData.nhisNumber.trim() : existingUser.nhisNumber,
          nhisExpiryDate: formData.nhisExpiryDate ? new Date(formData.nhisExpiryDate) : existingUser.nhisExpiryDate,
          insuranceProvider: formData.insuranceProvider ? formData.insuranceProvider.trim() : existingUser.insuranceProvider,
          insurancePolicyNumber: formData.insurancePolicyNumber ? formData.insurancePolicyNumber.trim() : existingUser.insurancePolicyNumber,
          insuranceExpiryDate: formData.insuranceExpiryDate ? new Date(formData.insuranceExpiryDate) : existingUser.insuranceExpiryDate,
          updatedAt: new Date(),
          ...existingDobUpdate,
        })
        .where(eq(users.id, existingUser.id))
      console.log(`[onboardPatient] Reusing and updating existing user record ${existingUser.id} for email ${emailLower}`)
    } else {
      // 1. Generate invitation token and temporary placeholders
      const inviteToken = `INV-PW-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      
      // 2. Register patient directly in our DB immediately (so hospital sees it instantly!)
      let newUserDob: Date | undefined
      if (formData.dateOfBirth) {
        newUserDob = new Date(formData.dateOfBirth)
      } else if (formData.age != null && formData.age !== '') {
        const ageNum = parseInt(String(formData.age), 10)
        if (!Number.isNaN(ageNum) && ageNum >= 10 && ageNum <= 60) {
          newUserDob = dateOfBirthFromAge(ageNum)
        }
      }

      const [inserted] = await db.insert(users).values({
        clerkId: inviteToken, // placeholder invitation token
        email: emailLower,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone || null,
        role: formData.role || 'pregnant_woman',
        address: formData.address || null,
        hospitalId: dbUser.hospitalId,
        dateOfBirth: newUserDob,
        isVerified: false,
        ghanaCardId: formData.ghanaCardId ? formData.ghanaCardId.trim() : null,
        nhisNumber: formData.nhisNumber ? formData.nhisNumber.trim() : null,
        nhisExpiryDate: formData.nhisExpiryDate ? new Date(formData.nhisExpiryDate) : null,
        insuranceProvider: formData.insuranceProvider ? formData.insuranceProvider.trim() : null,
        insurancePolicyNumber: formData.insurancePolicyNumber ? formData.insurancePolicyNumber.trim() : null,
        insuranceExpiryDate: formData.insuranceExpiryDate ? new Date(formData.insuranceExpiryDate) : null,
      }).returning()
      newUser = inserted
      console.log(`[onboardPatient] Created new patient record ${newUser.id} in DB`)
    }

    let activePregnancyId: string | null = null

    // 3. Create or update Pregnancy record if applicable
    if ((formData.role || 'pregnant_woman') === 'pregnant_woman' && formData.lmp) {
      let hospitalId = dbUser.hospitalId;
      if (!hospitalId) {
        throw new Error('You must be assigned to a hospital to onboard a patient.')
      }

      // Parse blood type from combined format e.g. "O+" -> { bloodType: 'O', rhesusFactor: 'Positive' }
      let parsedBloodType: string | null = null
      let parsedRhesusFactor: 'Positive' | 'Negative' | null = null
      if (formData.bloodType && formData.bloodType.trim()) {
        const btMatch = formData.bloodType.trim().match(/^(A|B|AB|O)(\+|-)$/)
        if (btMatch) {
          parsedBloodType = btMatch[1]
          parsedRhesusFactor = btMatch[2] === '+' ? 'Positive' : 'Negative'
        } else {
          parsedBloodType = formData.bloodType.trim()
        }
      }

      // Check if pregnancy record already exists for this patient
      const existingPregnancy = await db.query.pregnancies.findFirst({
        where: eq(pregnancies.userId, newUser.id)
      })

      if (!existingPregnancy) {
        const [createdPregnancy] = await db.insert(pregnancies).values({
          userId: newUser.id,
          hospitalId: formData.hospitalId || hospitalId,
          gravidity: parseInt(formData.gravidity) || 1,
          parity: parseInt(formData.parity) || 0,
          lmp: new Date(formData.lmp),
          edd: new Date(new Date(formData.lmp).setDate(new Date(formData.lmp).getDate() + 280)),
          status: 'active',
          ...(parsedBloodType && { bloodType: parsedBloodType }),
          ...(parsedRhesusFactor && { rhesusFactor: parsedRhesusFactor }),
        }).returning()
        activePregnancyId = createdPregnancy.id
        console.log(`[onboardPatient] Instantiated new pregnancy record for user ${newUser.id} (blood type: ${parsedBloodType || 'not provided'})`)
      } else {
        // Update existing pregnancy record
        await db.update(pregnancies)
          .set({
            hospitalId: formData.hospitalId || hospitalId,
            gravidity: parseInt(formData.gravidity) || existingPregnancy.gravidity,
            parity: parseInt(formData.parity) || existingPregnancy.parity,
            lmp: new Date(formData.lmp),
            edd: new Date(new Date(formData.lmp).setDate(new Date(formData.lmp).getDate() + 280)),
            ...(parsedBloodType && { bloodType: parsedBloodType }),
            ...(parsedRhesusFactor && { rhesusFactor: parsedRhesusFactor }),
          })
          .where(eq(pregnancies.id, existingPregnancy.id))
        activePregnancyId = existingPregnancy.id
        console.log(`[onboardPatient] Updated existing pregnancy record ${existingPregnancy.id} for user ${newUser.id} (blood type: ${parsedBloodType || 'not provided'})`)
      }
    }

    let partnerInvite: { email: string; invited: boolean; error?: string } | null = null
    const partnerEmail = (formData.partnerEmail || formData.fatherEmail || '').trim().toLowerCase()
    if (partnerEmail && activePregnancyId) {
      partnerInvite = await invitePartnerDuringOnboarding({
        partnerEmail,
        partnerFirstName: formData.partnerFirstName || formData.fatherFirstName,
        partnerLastName: formData.partnerLastName || formData.fatherLastName,
        pregnancyId: activePregnancyId,
        pregnantWomanId: newUser.id,
        patientEmail: emailLower,
        origin,
      })
    }

    // 4. Send programmatic Clerk Invitation to trigger automatic email delivery
    let clerkInviteSent = false
    let clerkErrorMsg: string | null = null
    try {
      const client = await clerkClient()
      await client.invitations.createInvitation({
        emailAddress: emailLower,
        redirectUrl: `${origin}/sign-up`,
        publicMetadata: {
          role: formData.role || 'pregnant_woman',
          phone: formData.phone || '',
          hospitalId: dbUser.hospitalId || '',
        },
        ignoreExisting: true,
      })
      clerkInviteSent = true
      console.log(`[onboardPatient] Programmatic Clerk Invitation successfully sent/resent to pregnant woman ${emailLower}`)
    } catch (clerkErr: any) {
      clerkErrorMsg = clerkErr?.message || clerkErr?.longMessage || String(clerkErr)
      console.error('[onboardPatient] Warning: Clerk programmatic invitation failed:', clerkErr)
      // We still proceed so the DB record is persisted
    }

    revalidatePath('/dashboard/hospital')
    return { 
      success: true, 
      data: {
        email: emailLower, 
        isInvitationFlow: true,
        loginUrl: `${origin}/sign-up`,
        partnerInvite,
        clerkInviteSent,
        clerkErrorMsg,
      }
    }
  } catch (error: any) {
    console.error('Onboarding error:', error)
    return { success: false, error: error?.errors?.[0]?.message || 'Failed to onboard patient' }
  }
}

/** Invite partner/father during hospital patient onboarding (own account, father role) */
async function invitePartnerDuringOnboarding(params: {
  partnerEmail: string
  partnerFirstName?: string
  partnerLastName?: string
  pregnancyId: string
  pregnantWomanId: string
  patientEmail: string
  origin: string
}): Promise<{ email: string; invited: boolean; error?: string }> {
  const emailLower = params.partnerEmail.trim().toLowerCase()
  if (!emailLower) return { email: '', invited: false, error: 'Partner email required' }
  if (emailLower === params.patientEmail) {
    return { email: emailLower, invited: false, error: 'Partner email must be different from the patient email' }
  }

  let fatherUser = await db.query.users.findFirst({
    where: eq(users.email, emailLower),
  })

  if (fatherUser && !['father', 'pregnant_woman'].includes(fatherUser.role)) {
    return {
      email: emailLower,
      invited: false,
      error: 'That email is already registered as hospital staff',
    }
  }

  if (fatherUser?.role === 'pregnant_woman') {
    return { email: emailLower, invited: false, error: 'That email belongs to a patient account' }
  }

  if (!fatherUser) {
    const inviteToken = `INV-FTR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
    const [inserted] = await db.insert(users).values({
      clerkId: inviteToken,
      email: emailLower,
      firstName: (params.partnerFirstName || 'Partner').trim(),
      lastName: (params.partnerLastName || '').trim(),
      role: 'father',
      isVerified: false,
      isActive: true,
    }).returning()
    fatherUser = inserted
  } else {
    await db
      .update(users)
      .set({
        firstName: (params.partnerFirstName || fatherUser.firstName).trim(),
        lastName: (params.partnerLastName || fatherUser.lastName).trim(),
        role: 'father',
        updatedAt: new Date(),
      })
      .where(eq(users.id, fatherUser.id))
  }

  const existingAccess = await db.query.partnerAccess.findFirst({
    where: and(
      eq(partnerAccess.partnerId, fatherUser.id),
      eq(partnerAccess.pregnancyId, params.pregnancyId)
    ),
  })

  if (!existingAccess) {
    await db.insert(partnerAccess).values({
      pregnantWomanId: params.pregnantWomanId,
      partnerId: fatherUser.id,
      pregnancyId: params.pregnancyId,
      canViewAppointments: true,
      canViewLabResults: true,
      canViewProgress: true,
      canReceiveNotifications: true,
      isActive: false,
    })
  }

  try {
    const client = await clerkClient()
    await client.invitations.createInvitation({
      emailAddress: emailLower,
      redirectUrl: `${origin}/sign-up`,
      publicMetadata: {
        role: 'father',
        pregnancyId: params.pregnancyId,
        pregnantWomanId: params.pregnantWomanId,
      },
      ignoreExisting: true,
    })
    console.log(`[onboardPatient] Partner invitation sent to ${emailLower}`)
    return { email: emailLower, invited: true }
  } catch (clerkErr: any) {
    console.error('[onboardPatient] Partner Clerk invitation failed:', clerkErr)
    const errorMsg = clerkErr?.message || clerkErr?.longMessage || String(clerkErr)
    return {
      email: emailLower,
      invited: false,
      error: `Clerk invitation failed: ${errorMsg}`,
    }
  }
}

/**
 * Record an antenatal visit (midwife dashboard)
 */
/** Record vitals only (nurse triage / quick check) */
export async function recordVitals(formData: {
  pregnancyId: string
  weight?: string
  bpSystolic?: string
  bpDiastolic?: string
  heartRate?: string
  temperature?: string
  notes?: string
}) {
  try {
    const { dbUser } = await requireClinicalStaff()
    await ensureMCHSchema()

    let pregnancyId = formData.pregnancyId
    const bpSys = parseIntOrNull(formData.bpSystolic)
    const bpDia = parseIntOrNull(formData.bpDiastolic)

    // Self-healing fallback: If passed a userId instead of a pregnancyId, look up their active pregnancy
    const existingPregnancy = await db.query.pregnancies.findFirst({
      where: eq(pregnancies.id, pregnancyId),
    })
    if (!existingPregnancy) {
      const activePreg = await db.query.pregnancies.findFirst({
        where: and(
          eq(pregnancies.userId, pregnancyId),
          eq(pregnancies.status, 'active')
        )
      })
      if (activePreg) {
        console.log(`[recordVitals] SELF-HEALING: Resolved passed userId ${pregnancyId} to active pregnancyId ${activePreg.id}`)
        pregnancyId = activePreg.id
      }
    }

    await db.insert(vitalSigns).values({
      pregnancyId,
      recordedDate: new Date(),
      weight: parseDecimalOrNull(formData.weight),
      bloodPressureSystolic: bpSys,
      bloodPressureDiastolic: bpDia,
      heartRate: parseIntOrNull(formData.heartRate),
      temperature: parseDecimalOrNull(formData.temperature),
      recordedBy: dbUser.id,
      notes: formData.notes || 'Vitals recorded at clinic',
    })

    await notifyPregnancyUpdate(
      pregnancyId,
      'Your clinic has recorded new vital signs.',
      'vitals-update'
    )
    await recordFacilityCareEvent({
      pregnancyId,
      staffUserId: dbUser.id,
      staffHospitalId: dbUser.hospitalId,
      action: 'vitals',
      summary: formData.notes?.trim() || 'Vital signs recorded at clinic',
    })
    revalidatePregnancyPaths(pregnancyId)
    return { success: true }
  } catch (error: unknown) {
    console.error('recordVitals error:', error)
    return { success: false, error: 'Failed to save vitals' }
  }
}

function parseCommaList(value?: string | null): string[] {
  if (!value) return []
  return String(value)
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function mergeUniqueList(
  existing: string[] | null | undefined,
  added: string[]
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of [...(existing || []), ...added]) {
    const key = item.trim()
    if (!key) continue
    const lower = key.toLowerCase()
    if (seen.has(lower)) continue
    seen.add(lower)
    out.push(key)
  }
  return out
}

/** Update allergies, medications, and medical history on the pregnancy record */
export async function updatePregnancyMedicalInfo(
  pregnancyId: string,
  data: {
    medicalHistory?: string
    allergies?: string
    medications?: string
    addMedications?: string
  }
) {
  try {
    const { dbUser } = await requireClinicalStaff()
    await ensureMCHSchema()

    const pregnancy = await db.query.pregnancies.findFirst({
      where: eq(pregnancies.id, pregnancyId),
    })
    if (!pregnancy) return { success: false, error: 'Pregnancy not found' }

    if (dbUser.role !== 'admin' && !['hospital_staff', 'midwife'].includes(dbUser.role)) {
      return { success: false, error: 'Not authorized for this patient' }
    }
    if (!dbUser.hospitalId && dbUser.role !== 'admin') {
      return { success: false, error: 'Link your account to a hospital first' }
    }

    const update: Partial<typeof pregnancies.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (data.medicalHistory !== undefined) {
      update.medicalHistory = data.medicalHistory.trim() || null
    }
    if (data.allergies !== undefined) {
      update.allergies = parseCommaList(data.allergies)
    }

    let medsChanged = false
    if (data.medications !== undefined) {
      update.medications = parseCommaList(data.medications)
      medsChanged = true
    } else if (data.addMedications) {
      const added = parseCommaList(data.addMedications)
      if (added.length > 0) {
        update.medications = mergeUniqueList(pregnancy.medications, added)
        medsChanged = true
      }
    }

    await db.update(pregnancies).set(update).where(eq(pregnancies.id, pregnancyId))

    if (medsChanged) {
      await notifyPatientForPregnancy(
        pregnancyId,
        'Your clinic updated your current medications. Please review them in your dashboard.',
        'clinical_update',
        'mch-update'
      )
    } else {
      await notifyPregnancyUpdate(
        pregnancyId,
        'Your medical history and allergy information was updated by your clinic.'
      )
    }

    await recordFacilityCareEvent({
      pregnancyId,
      staffUserId: dbUser.id,
      staffHospitalId: dbUser.hospitalId,
      action: 'medical_update',
      summary: 'Allergies, medications, or medical history updated',
    })
    revalidatePregnancyPaths(pregnancyId)
    return { success: true }
  } catch (err: unknown) {
    console.error('updatePregnancyMedicalInfo error:', err)
    const message = err instanceof Error ? err.message : 'Failed to update medical information'
    return { success: false, error: message }
  }
}

/** Full ANC visit: vitals + clinical findings + optional follow-up appointment */
export async function recordAntenatalVisit(formData: any) {
  try {
    const { dbUser } = await requireClinicalStaff()
    await ensureMCHSchema()

    let pregnancyId = formData.pregnancyId as string
    const hospitalId = formData.hospitalId as string
    const gestationalAge = parseIntOrNull(formData.gestationalAge)
    const bpSys = parseIntOrNull(formData.bpSystolic)
    const bpDia = parseIntOrNull(formData.bpDiastolic)
    const fhr = parseIntOrNull(formData.fhr)
    const heartRate = parseIntOrNull(formData.heartRate)

    let existingPregnancy = await db.query.pregnancies.findFirst({
      where: eq(pregnancies.id, pregnancyId),
    })

    // Self-healing fallback: If the midwife client passed a userId instead of a pregnancyId, look up their active pregnancy
    if (!existingPregnancy) {
      existingPregnancy = await db.query.pregnancies.findFirst({
        where: and(
          eq(pregnancies.userId, pregnancyId),
          eq(pregnancies.status, 'active')
        )
      })
      if (existingPregnancy) {
        console.log(`[recordAntenatalVisit] SELF-HEALING: Resolved passed userId ${pregnancyId} to active pregnancyId ${existingPregnancy.id}`)
        pregnancyId = existingPregnancy.id
      } else {
        throw new Error('Active pregnancy record not found for this patient')
      }
    }

    const pregnancyUpdate: Partial<typeof pregnancies.$inferInsert> = {}
    if (formData.medicalHistory) pregnancyUpdate.medicalHistory = formData.medicalHistory
    if (formData.allergies) {
      pregnancyUpdate.allergies = parseCommaList(formData.allergies)
    }
    if (formData.medications) {
      pregnancyUpdate.medications = parseCommaList(formData.medications)
    } else if (formData.prescribedMedications && existingPregnancy) {
      const added = parseCommaList(formData.prescribedMedications)
      if (added.length > 0) {
        pregnancyUpdate.medications = mergeUniqueList(existingPregnancy.medications, added)
      }
    }
    if (formData.bloodType) pregnancyUpdate.bloodType = formData.bloodType
    if (formData.rhesusFactor) pregnancyUpdate.rhesusFactor = formData.rhesusFactor
    if (gestationalAge !== null) pregnancyUpdate.gestationalAge = gestationalAge

    if (Object.keys(pregnancyUpdate).length > 0) {
      await db.update(pregnancies).set(pregnancyUpdate).where(eq(pregnancies.id, pregnancyId))
    }

    await db.insert(vitalSigns).values({
      pregnancyId,
      recordedDate: new Date(),
      weight: parseDecimalOrNull(formData.weight),
      bloodPressureSystolic: bpSys,
      bloodPressureDiastolic: bpDia,
      heartRate: heartRate ?? fhr,
      recordedBy: dbUser.id,
      notes: formData.notes || 'ANC clinic visit',
    })

    const bpText =
      bpSys !== null && bpDia !== null ? `${bpSys}/${bpDia}` : formData.bpSystolic && formData.bpDiastolic
        ? `${formData.bpSystolic}/${formData.bpDiastolic}`
        : null

    await db.insert(appointments).values({
      pregnancyId,
      hospitalId,
      midwifeId: dbUser.id,
      scheduledDate: new Date(),
      actualDate: new Date(),
      gestationalAge: gestationalAge ?? undefined,
      weight: parseDecimalOrNull(formData.weight),
      bloodPressure: bpText,
      fundalHeight: parseDecimalOrNull(formData.fundalHeight),
      fetalHeartRate: fhr ?? undefined,
      presentation: formData.presentation || null,
      findings: formData.findings || null,
      recommendations: formData.recommendations || null,
      hemoglobin: parseDecimalOrNull(formData.hemoglobin),
      proteinuria: formData.proteinuria || null,
      edema: formData.edema || null,
      nextVisitDate: formData.nextVisitDate ? new Date(formData.nextVisitDate) : null,
      status: 'completed',
      notes: formData.notes || null,
    })

    if (formData.nextVisitDate) {
      await db.insert(appointments).values({
        pregnancyId,
        hospitalId,
        midwifeId: dbUser.id,
        scheduledDate: new Date(formData.nextVisitDate),
        status: 'scheduled',
      })
    }

    const notifyParts = ['A new Antenatal Clinic (ANC) checkup was recorded by your hospital.']
    if (pregnancyUpdate.medications) {
      notifyParts.push('Your prescribed medications list was updated.')
    }
    await notifyPregnancyUpdate(pregnancyId, notifyParts.join(' '))
    await recordFacilityCareEvent({
      pregnancyId,
      staffUserId: dbUser.id,
      staffHospitalId: hospitalId || dbUser.hospitalId,
      action: 'anc_visit',
      summary: `ANC visit documented${gestationalAge != null ? ` at ${gestationalAge} weeks` : ''}`,
    })
    revalidatePregnancyPaths(pregnancyId)
    return { success: true }
  } catch (error: unknown) {
    console.error('Record visit error:', error)
    return { success: false, error: 'Failed to record visit details' }
  }
}

/** Record lab test or imaging scan result for a pregnancy */
export async function recordLabOrScan(formData: {
  pregnancyId: string
  testName: string
  testType?: 'lab' | 'scan'
  resultValue?: string
  normalRange?: string
  interpretation?: string
  status?: 'pending' | 'completed' | 'abnormal' | 'critical'
  sampleDate?: string
  resultDate?: string
  attachmentUrl?: string
  attachmentName?: string
}) {
  try {
    const { dbUser } = await requireClinicalStaff()
    await ensureMCHSchema()

    let pregnancyId = formData.pregnancyId
    const isScan = formData.testType === 'scan'
    const testName = formData.testName?.trim()
    if (!testName) return { success: false, error: 'Test or scan name is required' }

    // Self-healing fallback: If passed a userId instead of a pregnancyId, look up their active pregnancy
    const existingPregnancy = await db.query.pregnancies.findFirst({
      where: eq(pregnancies.id, pregnancyId),
    })
    if (!existingPregnancy) {
      const activePreg = await db.query.pregnancies.findFirst({
        where: and(
          eq(pregnancies.userId, pregnancyId),
          eq(pregnancies.status, 'active')
        )
      })
      if (activePreg) {
        console.log(`[recordLabOrScan] SELF-HEALING: Resolved passed userId ${pregnancyId} to active pregnancyId ${activePreg.id}`)
        pregnancyId = activePreg.id
      }
    }

    const status = formData.status || (formData.resultValue ? 'completed' : 'pending')
    const now = new Date()

    await db.insert(labTests).values({
      pregnancyId,
      testName: isScan ? `Scan: ${testName}` : testName,
      testCode: isScan ? 'SCAN' : 'LAB',
      orderedDate: now,
      sampleDate: formData.sampleDate ? new Date(formData.sampleDate) : now,
      resultDate: formData.resultDate
        ? new Date(formData.resultDate)
        : formData.resultValue
          ? now
          : null,
      resultValue: formData.resultValue || null,
      normalRange: formData.normalRange || null,
      interpretation: formData.interpretation || null,
      status,
      orderedBy: dbUser.id,
      performedBy: dbUser.id,
      attachmentUrl: formData.attachmentUrl || null,
      attachmentName: formData.attachmentName || null,
    })

    await notifyPregnancyUpdate(
      pregnancyId,
      isScan
        ? 'A new ultrasound/imaging scan was added to your record.'
        : 'New lab results were added to your record.',
      'labs-update'
    )
    await recordFacilityCareEvent({
      pregnancyId,
      staffUserId: dbUser.id,
      staffHospitalId: dbUser.hospitalId,
      action: 'lab_scan',
      summary: isScan ? `Imaging: ${testName}` : `Lab: ${testName}`,
    })
    revalidatePregnancyPaths(pregnancyId)
    return { success: true }
  } catch (error: unknown) {
    console.error('recordLabOrScan error:', error)
    return { success: false, error: 'Failed to save lab or scan record' }
  }
}

/** Standing advice shown on patient "Recommended for You" (editable by hospital) */
export async function updatePregnancyStandingAdvice(pregnancyId: string, advice: string) {
  try {
    const { dbUser } = await requireClinicalStaff()

    const pregnancy = await db.query.pregnancies.findFirst({
      where: eq(pregnancies.id, pregnancyId),
    })
    if (!pregnancy) return { success: false, error: 'Pregnancy not found' }

    if (dbUser.role !== 'admin' && !['hospital_staff', 'midwife'].includes(dbUser.role)) {
      return { success: false, error: 'Not authorized' }
    }

    const mchData = { ...((pregnancy.mchData as object) || {}), standingAdvice: advice.trim() }

    await db
      .update(pregnancies)
      .set({ mchData, updatedAt: new Date() })
      .where(eq(pregnancies.id, pregnancyId))

    await notifyPatientForPregnancy(
      pregnancyId,
      'Your clinic posted new health advice on your dashboard.',
      'clinical_update',
      'mch-update'
    )
    await recordFacilityCareEvent({
      pregnancyId,
      staffUserId: dbUser.id,
      staffHospitalId: dbUser.hospitalId,
      action: 'mch_advice',
      summary: 'Standing health advice updated for patient dashboard',
    })
    revalidatePregnancyPaths(pregnancyId)
    return { success: true }
  } catch (err: unknown) {
    console.error('updatePregnancyStandingAdvice error:', err)
    const message = err instanceof Error ? err.message : 'Failed to save advice'
    return { success: false, error: message }
  }
}

/** Mother generates a one-time code for her invited partner to unlock read-only access */
export async function generateFatherJoinCode(pregnancyId: string) {
  const user = await currentUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id),
  })
  if (!dbUser || dbUser.role !== 'pregnant_woman') {
    return { success: false, error: 'Unauthorized' }
  }

  const pregnancy = await db.query.pregnancies.findFirst({
    where: eq(pregnancies.id, pregnancyId),
  })
  if (!pregnancy || pregnancy.userId !== dbUser.id) {
    return { success: false, error: 'Not your pregnancy record' }
  }

  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  try {
    await db
      .update(pregnancies)
      .set({
        fatherJoinCode: joinCode,
        fatherJoinCodeExpires: expiresAt,
      })
      .where(eq(pregnancies.id, pregnancyId))

    revalidatePath('/dashboard/pregnant-woman')
    return { success: true, code: joinCode }
  } catch (error) {
    console.error('Error generating join code:', error)
    return { success: false, error: 'Failed to generate code' }
  }
}

/** Father enters mother's code after completing hospital email registration */
export async function linkFatherViaToken(joinCode: string) {
  const user = await currentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id),
  })

  if (!dbUser || dbUser.role !== 'father') {
    return {
      success: false,
      error: 'Sign in with your partner invitation email.',
    }
  }

  try {
    const pregnancy = await db.query.pregnancies.findFirst({
      where: and(
        eq(pregnancies.fatherJoinCode, joinCode.toUpperCase().trim()),
        sql`${pregnancies.fatherJoinCodeExpires} > NOW()`
      ),
    })

    if (!pregnancy) {
      return {
        success: false,
        error: 'Invalid or expired code. Ask your partner to generate a new code.',
      }
    }

    let pendingAccess = await db.query.partnerAccess.findFirst({
      where: and(
        eq(partnerAccess.partnerId, dbUser.id),
        eq(partnerAccess.pregnancyId, pregnancy.id)
      ),
    })

    if (!pendingAccess) {
      console.log(`Auto-creating partnerAccess for partner ${dbUser.id} and pregnancy ${pregnancy.id}`)
      const [newAccess] = await db.insert(partnerAccess).values({
        pregnantWomanId: pregnancy.userId,
        partnerId: dbUser.id,
        pregnancyId: pregnancy.id,
        canViewAppointments: true,
        canViewLabResults: true,
        canViewProgress: true,
        canReceiveNotifications: true,
        isActive: false, // will be activated below
      }).returning()
      pendingAccess = newAccess
    }

    if (pendingAccess.isActive) {
      revalidatePath('/dashboard/father')
      return { success: true }
    }

    await db
      .update(partnerAccess)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(partnerAccess.id, pendingAccess.id))

    await db
      .update(pregnancies)
      .set({
        fatherJoinCode: null,
        fatherJoinCodeExpires: null,
      })
      .where(eq(pregnancies.id, pregnancy.id))

    revalidatePath('/dashboard/father')
    revalidatePath('/dashboard/pregnant-woman')
    return { success: true }
  } catch (error) {
    console.error('linkFatherViaToken error:', error)
    return { success: false, error: 'Verification failed' }
  }
}

/** Mother directly onboards her partner/father from her own dashboard */
export async function onboardPartnerByMother(formData: {
  email: string
  firstName: string
  lastName: string
  pregnancyId: string
}) {
  try {
    const user = await currentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, user.id),
    })

    if (!dbUser || dbUser.role !== 'pregnant_woman') {
      return { success: false, error: 'Only pregnant mothers can onboard their partners.' }
    }

    const emailLower = formData.email.trim().toLowerCase()
    const firstName = formData.firstName.trim()
    const lastName = formData.lastName.trim()

    // 1. Verify pregnancy ownership
    const pregnancy = await db.query.pregnancies.findFirst({
      where: eq(pregnancies.id, formData.pregnancyId),
    })

    if (!pregnancy || pregnancy.userId !== dbUser.id) {
      return { success: false, error: 'Not your pregnancy record' }
    }

    // 2. Pre-register partner/father in the users table so syncClerkAccount works
    let partnerUser = await db.query.users.findFirst({
      where: eq(users.email, emailLower),
    })

    if (partnerUser) {
      if (partnerUser.role !== 'father') {
        return { success: false, error: 'This email is already registered with another role.' }
      }
      await db
        .update(users)
        .set({
          firstName,
          lastName,
          updatedAt: new Date(),
        })
        .where(eq(users.id, partnerUser.id))
    } else {
      const inviteToken = `INV-PARTNER-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      const [newPartner] = await db.insert(users).values({
        clerkId: inviteToken,
        email: emailLower,
        firstName,
        lastName,
        role: 'father',
        isVerified: false,
      }).returning()
      partnerUser = newPartner
    }

    // 3. Setup/Ensure partnerAccess record is provisioned
    const existingAccess = await db.query.partnerAccess.findFirst({
      where: and(
        eq(partnerAccess.partnerId, partnerUser.id),
        eq(partnerAccess.pregnancyId, pregnancy.id)
      ),
    })

    if (!existingAccess) {
      await db.insert(partnerAccess).values({
        pregnantWomanId: dbUser.id,
        partnerId: partnerUser.id,
        pregnancyId: pregnancy.id,
        canViewAppointments: true,
        canViewLabResults: true,
        canViewProgress: true,
        canReceiveNotifications: true,
        isActive: false, // will be true once they verify
      })
    }

    // 4. Send Clerk invitation email
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://maternalcareplus.vercel.app'
    try {
      const client = await clerkClient()
      await client.invitations.createInvitation({
        emailAddress: emailLower,
        redirectUrl: `${origin}/sign-up`,
        publicMetadata: {
          role: 'father',
          phone: '',
        },
        ignoreExisting: true,
      })
    } catch (clerkErr) {
      console.warn('[onboardPartnerByMother] Clerk invite warning:', clerkErr)
    }

    // 5. Proactively generate their join code so the mother can view and share it immediately
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await db
      .update(pregnancies)
      .set({
        fatherJoinCode: joinCode,
        fatherJoinCodeExpires: expiresAt,
      })
      .where(eq(pregnancies.id, pregnancy.id))

    revalidatePath('/dashboard/pregnant-woman')
    return { success: true, code: joinCode }
  } catch (err: unknown) {
    console.error('onboardPartnerByMother error:', err)
    const message = err instanceof Error ? err.message : 'Failed to onboard partner'
    return { success: false, error: message }
  }
}

/**
 * Send a chat message
 */
export async function sendMessage(receiverId: string, content: string, pregnancyId?: string) {
  const user = await currentUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id)
  })

  if (!dbUser) throw new Error('User not found')

  try {
    const [newMessage] = await db.insert(messages).values({
      senderId: dbUser.id,
      receiverId,
      pregnancyId: pregnancyId || null,
      content,
      status: 'sent',
    }).returning()

    const serialized = JSON.parse(JSON.stringify(newMessage))

    try {
      await pusherServer.trigger(`chat-${receiverId}`, 'new-message', serialized)
      await pusherServer.trigger(`chat-${dbUser.id}`, 'new-message', serialized)
    } catch (pusherErr) {
      console.warn('Pusher chat trigger failed:', pusherErr)
    }

    if (pregnancyId) {
      const pregnancy = await db.query.pregnancies.findFirst({
        where: eq(pregnancies.id, pregnancyId),
      })
      if (pregnancy && pregnancy.userId === receiverId) {
        await notifyPatientForPregnancy(
          pregnancyId,
          `New message from your care team: "${content.slice(0, 80)}${content.length > 80 ? '…' : ''}"`,
          'message',
          'message'
        )
      }
    }

    return { success: true, message: serialized }
  } catch (error) {
    console.error('Error sending message:', error)
    return { success: false, error: 'Failed to send message' }
  }
}

async function getHospitalStaffUserIds(hospitalId: string) {
  const staff = await db.query.users.findMany({
    where: and(
      eq(users.hospitalId, hospitalId),
      or(eq(users.role, 'midwife'), eq(users.role, 'hospital_staff'))
    ),
  })
  return staff.map((s) => s.id)
}

/**
 * Patient ↔ hospital staff message threads (for hospital dashboard inbox)
 */
export async function getHospitalMessageThreads() {
  try {
    const { dbUser } = await requireClinicalStaff()
    if (!dbUser.hospitalId) return []

    const staffIds = await getHospitalStaffUserIds(dbUser.hospitalId)
    if (staffIds.length === 0) return []

    const activePregnancies = await db.query.pregnancies.findMany({
      where: and(
        eq(pregnancies.hospitalId, dbUser.hospitalId),
        eq(pregnancies.status, 'active')
      ),
    })

    const threads: {
      patientUserId: string
      patientName: string
      pregnancyId: string
      lastMessage: string
      lastMessageAt: string
      unreadCount: number
      assignedStaffName: string | null
    }[] = []

    for (const preg of activePregnancies) {
      const patient = await db.query.users.findFirst({
        where: eq(users.id, preg.userId),
      })
      if (!patient) continue

      const recent = await db.query.messages.findMany({
        where: and(
          or(eq(messages.senderId, patient.id), eq(messages.receiverId, patient.id)),
          or(inArray(messages.senderId, staffIds), inArray(messages.receiverId, staffIds))
        ),
        orderBy: [desc(messages.createdAt)],
        limit: 1,
      })
      const last = recent[0]
      if (!last) continue

      const unreadRows = await db.query.messages.findMany({
        where: and(
          eq(messages.senderId, patient.id),
          inArray(messages.receiverId, staffIds),
          sql`${messages.readAt} IS NULL`
        ),
      })

      let assignedStaffName: string | null = null
      if (preg.midwifeId) {
        const assigned = await db.query.users.findFirst({
          where: eq(users.id, preg.midwifeId),
        })
        if (assigned) {
          assignedStaffName = `${assigned.firstName} ${assigned.lastName}`.trim()
        }
      }

      threads.push({
        patientUserId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`.trim() || patient.email,
        pregnancyId: preg.id,
        lastMessage: last.content,
        lastMessageAt: last.createdAt as unknown as string,
        unreadCount: unreadRows.length,
        assignedStaffName,
      })
    }

    threads.sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    )

    return JSON.parse(JSON.stringify(threads))
  } catch (err) {
    console.error('getHospitalMessageThreads error:', err)
    return []
  }
}

/**
 * Get messages between two users (hospital staff see full clinic thread with a patient)
 */
export async function getMessages(otherUserId: string) {
  const user = await currentUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id)
  })

  if (!dbUser) throw new Error('User not found')

  try {
    const otherUser = await db.query.users.findFirst({
      where: eq(users.id, otherUserId),
    })

    const isClinicalStaff = ['midwife', 'hospital_staff', 'admin'].includes(dbUser.role)
    const isPatientChat =
      otherUser?.role === 'pregnant_woman' && isClinicalStaff && dbUser.hospitalId

    let allMessages: (typeof messages.$inferSelect)[] = []

    if (isPatientChat) {
      const staffIds = await getHospitalStaffUserIds(dbUser.hospitalId!)
      const participantIds = [...new Set([...staffIds, dbUser.id])]

      allMessages = await db.query.messages.findMany({
        where: and(
          or(eq(messages.senderId, otherUserId), eq(messages.receiverId, otherUserId)),
          or(
            inArray(messages.senderId, participantIds),
            inArray(messages.receiverId, participantIds)
          )
        ),
        orderBy: [desc(messages.createdAt)],
        limit: 100,
      })

      await db
        .update(messages)
        .set({ readAt: new Date(), status: 'read' })
        .where(
          and(
            eq(messages.senderId, otherUserId),
            inArray(messages.receiverId, participantIds),
            sql`${messages.readAt} IS NULL`
          )
        )
    } else {
      allMessages = await db.query.messages.findMany({
        where: or(
          and(eq(messages.senderId, dbUser.id), eq(messages.receiverId, otherUserId)),
          and(eq(messages.senderId, otherUserId), eq(messages.receiverId, dbUser.id))
        ),
        orderBy: [desc(messages.createdAt)],
        limit: 50,
      })
    }

    return allMessages.reverse()
  } catch (error) {
    console.error('Error fetching messages:', error)
    return []
  }
}

/**
 * MCH Book Actions
 */

function eddFromLmp(lmp: Date): Date {
  const edd = new Date(lmp)
  edd.setDate(edd.getDate() + 280)
  return edd
}

/** Set LMP / EDD / gestational age — drives the patient progress dashboard */
export async function updatePregnancyTimeline(
  pregnancyId: string,
  data: { lmp?: string; edd?: string; gestationalAgeWeeks?: number }
) {
  try {
    const { dbUser } = await requireClinicalStaff()

    const pregnancy = await db.query.pregnancies.findFirst({
      where: eq(pregnancies.id, pregnancyId),
    })
    if (!pregnancy) return { success: false, error: 'Pregnancy not found' }

    if (dbUser.role !== 'admin' && !['hospital_staff', 'midwife'].includes(dbUser.role)) {
      return { success: false, error: 'Not authorized for this patient' }
    }

    const update: Partial<typeof pregnancies.$inferInsert> = { updatedAt: new Date() }

    if (data.lmp) {
      const lmpDate = new Date(data.lmp)
      if (Number.isNaN(lmpDate.getTime())) {
        return { success: false, error: 'Invalid LMP date' }
      }
      update.lmp = lmpDate
      update.edd = data.edd ? new Date(data.edd) : eddFromLmp(lmpDate)
      if (Number.isNaN((update.edd as Date).getTime())) {
        return { success: false, error: 'Invalid EDD date' }
      }
      update.gestationalAge = calcGestationalAgeWeeks(lmpDate)
    } else if (data.edd) {
      const eddDate = new Date(data.edd)
      if (Number.isNaN(eddDate.getTime())) {
        return { success: false, error: 'Invalid EDD date' }
      }
      update.edd = eddDate
    }

    if (data.gestationalAgeWeeks != null && !Number.isNaN(data.gestationalAgeWeeks)) {
      const weeks = Math.max(0, Math.min(42, Math.floor(data.gestationalAgeWeeks)))
      update.gestationalAge = weeks
    }

    if (Object.keys(update).length <= 1) {
      return { success: false, error: 'Provide LMP, EDD, or gestational age' }
    }

    await db.update(pregnancies).set(update).where(eq(pregnancies.id, pregnancyId))

    await notifyPregnancyUpdate(
      pregnancyId,
      'Your pregnancy dates and progress were updated by your clinic.'
    )
    await recordFacilityCareEvent({
      pregnancyId,
      staffUserId: dbUser.id,
      staffHospitalId: dbUser.hospitalId,
      action: 'timeline_update',
      summary: 'Pregnancy timeline (LMP/EDD/weeks) updated',
    })
    revalidatePregnancyPaths(pregnancyId)
    return { success: true }
  } catch (err: unknown) {
    console.error('updatePregnancyTimeline error:', err)
    const message = err instanceof Error ? err.message : 'Failed to update pregnancy dates'
    return { success: false, error: message }
  }
}

export async function savePreviousPregnancy(data: any) {
  const user = await currentUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id)
  })

  if (!dbUser || !['hospital_staff', 'midwife', 'admin'].includes(dbUser.role)) {
    throw new Error('Unauthorized role')
  }

  try {
    const outcome = data.outcome ?? data.alive
    const isAlive =
      outcome === 'alive' || outcome === 'true' || outcome === true

    const year = parseInt(String(data.year), 10)
    const duration = parseInt(String(data.duration), 10)

    await db.insert(previousPregnancies).values({
      userId: data.userId,
      year: Number.isNaN(year) ? new Date().getFullYear() : year,
      pregnancyDuration: Number.isNaN(duration) ? null : duration,
      modeOfDelivery: data.mode || null,
      birthWeight: data.weight ? parseDecimalOrNull(data.weight) : null,
      sex: data.sex || null,
      alive: isAlive,
      complications: data.complications || null,
    })

    if (data.pregnancyId) {
      await notifyPregnancyUpdate(
        data.pregnancyId,
        'Obstetric history (previous pregnancy) was updated by your clinic.'
      )
      revalidatePregnancyPaths(data.pregnancyId)
    }

    revalidatePath(`/dashboard/hospital/patients/${data.pregnancyId}/mch-book`)
    return { success: true }
  } catch (error) {
    console.error('Save previous pregnancy error:', error)
    return { success: false, error: 'Failed to save record' }
  }
}

/** Update Alive / Deceased on an existing previous pregnancy row */
export async function updatePreviousPregnancyOutcome(
  recordId: string,
  pregnancyId: string,
  outcome: 'alive' | 'deceased'
) {
  try {
    const { dbUser } = await requireClinicalStaff()

    const record = await db.query.previousPregnancies.findFirst({
      where: eq(previousPregnancies.id, recordId),
    })
    if (!record) return { success: false, error: 'Record not found' }

    await db
      .update(previousPregnancies)
      .set({ alive: outcome === 'alive' })
      .where(eq(previousPregnancies.id, recordId))

    await notifyPregnancyUpdate(
      pregnancyId,
      'Obstetric history was updated by your clinic.'
    )
    revalidatePregnancyPaths(pregnancyId)
    revalidatePath(`/dashboard/hospital/patients/${pregnancyId}/mch-book`)
    return { success: true }
  } catch (err: unknown) {
    console.error('updatePreviousPregnancyOutcome error:', err)
    const message = err instanceof Error ? err.message : 'Failed to update status'
    return { success: false, error: message }
  }
}

export async function saveDeliveryRecord(data: any) {
  const user = await currentUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id)
  })

  if (!dbUser || !['hospital_staff', 'midwife', 'admin'].includes(dbUser.role)) {
    throw new Error('Unauthorized role')
  }

  try {
    await db.insert(deliveries).values({
      pregnancyId: data.pregnancyId,
      hospitalId: dbUser.hospitalId!,
      deliveryDate: new Date(data.date),
      modeOfDelivery: data.mode,
      apgarScore1Min: parseInt(data.apgar1),
      apgarScore5Min: parseInt(data.apgar5),
      bloodLoss: parseInt(data.bloodLoss),
      maternalComplications: data.maternalComplications,
      neonatalComplications: data.neonatalComplications,
      deliveredBy: dbUser.id,
      notes: data.notes
    })

    // Update pregnancy status
    await db.update(pregnancies)
      .set({ status: 'completed' })
      .where(eq(pregnancies.id, data.pregnancyId))

    // Create child record
    await db.insert(children).values({
      pregnancyId: data.pregnancyId,
      userId: data.motherId,
      dateOfBirth: new Date(data.date),
      sex: data.sex,
      birthWeight: data.weight,
      birthLength: data.length
    })

    // Trigger Real-time update
    await pusherServer.trigger(`pregnancy-${data.pregnancyId}`, 'mch-update', {
      type: 'delivery',
      message: 'Delivery record completed! Congratulations!'
    })

    revalidatePath(`/dashboard/hospital/patients/${data.pregnancyId}/mch-book`)
    return { success: true }
  } catch (error) {
    console.error('Save delivery record error:', error)
    return { success: false, error: 'Failed to save delivery record' }
  }
}

export async function updateMCHPregnancyDetails(data: any) {
  const user = await currentUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id)
  })

  if (!dbUser || !['hospital_staff', 'midwife', 'admin'].includes(dbUser.role)) {
    throw new Error('Unauthorized role')
  }

  try {
    await db.update(pregnancies)
      .set({
        iptpDoses: parseInt(data.iptpDoses),
        ttDoses: parseInt(data.ttDoses),
        itnDistributed: data.itnDistributed === 'true'
      })
      .where(eq(pregnancies.id, data.pregnancyId))
    
    // Trigger Real-time update
    await pusherServer.trigger(`pregnancy-${data.pregnancyId}`, 'mch-update', {
      type: 'anc_details',
      message: 'ANC interventions updated'
    })

    revalidatePath(`/dashboard/hospital/patients/${data.pregnancyId}/mch-book`)
    return { success: true }
  } catch (error) {
    console.error('Update MCH details error:', error)
    return { success: false, error: 'Failed to update details' }
  }
}

export async function savePostnatalCare(data: any) {
  const user = await currentUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id)
  })

  if (!dbUser || !['hospital_staff', 'midwife', 'admin'].includes(dbUser.role)) {
    throw new Error('Unauthorized role')
  }

  try {
    await db.insert(postnatalCare).values({
      pregnancyId: data.pregnancyId,
      visitPeriod: data.period,
      visitDate: new Date(data.date),
      maternalCondition: data.maternalCondition,
      lochia: data.lochia,
      perineum: data.perineum,
      breastfeedingStatus: data.breastfeeding,
      babyCondition: data.babyCondition,
      umbilicalCord: data.umbilicalCord,
      familyPlanningMethod: data.familyPlanning,
      notes: data.notes
    })

    // Trigger Real-time update
    await pusherServer.trigger(`pregnancy-${data.pregnancyId}`, 'mch-update', {
      type: 'pnc',
      message: 'New postnatal care record added'
    })

    revalidatePath(`/dashboard/hospital/patients/${data.pregnancyId}/mch-book`)
    return { success: true }
  } catch (error) {
    console.error('Save postnatal care error:', error)
    return { success: false, error: 'Failed to save record' }
  }
}

export async function updateChildName(childId: string, firstName: string, lastName: string) {
  try {
    const { dbUser } = await requireClinicalStaff()
    await ensureMCHSchema()

    const child = await db.query.children.findFirst({ where: eq(children.id, childId) })
    if (!child) return { success: false, error: 'Child record not found' }

    await db.update(children)
      .set({ firstName: firstName.trim() || null, lastName: lastName.trim() || null })
      .where(eq(children.id, childId))

    revalidatePath(`/dashboard/hospital/patients/${child.pregnancyId}/mch-book`)
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update child name'
    return { success: false, error: message }
  }
}

export async function recordImmunization(data: any) {
  const user = await currentUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id)
  })

  if (!dbUser || !['hospital_staff', 'midwife', 'admin'].includes(dbUser.role)) {
    throw new Error('Unauthorized role')
  }

  try {
    await db.insert(immunizations).values({
      childId: data.childId,
      vaccineName: data.vaccineName,
      doseNumber: parseInt(data.doseNumber || '1'),
      targetAge: data.targetAge,
      dateAdministered: new Date(data.dateAdministered),
      batchNumber: data.batchNumber,
      administeredBy: dbUser.id
    })

    // Trigger Real-time update
    await pusherServer.trigger(`pregnancy-${data.pregnancyId}`, 'mch-update', {
      type: 'immunization',
      message: `Vaccine ${data.vaccineName} recorded!`
    })

    revalidatePath(`/dashboard/hospital/patients/${data.pregnancyId}/mch-book/child`)
    return { success: true }
  } catch (error) {
    console.error('Record immunization error:', error)
    return { success: false, error: 'Failed to record immunization' }
  }
}

export async function recordChildGrowth(data: any) {
  const user = await currentUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id)
  })

  if (!dbUser || !['hospital_staff', 'midwife', 'admin'].includes(dbUser.role)) {
    throw new Error('Unauthorized role')
  }

  try {
    await db.insert(childGrowth).values({
      childId: data.childId,
      recordDate: new Date(data.recordDate),
      ageInMonths: parseInt(data.ageInMonths),
      weight: data.weight,
      height: data.height,
      headCircumference: data.headCircumference,
      notes: data.notes
    })

    // Trigger Real-time update
    await pusherServer.trigger(`pregnancy-${data.pregnancyId}`, 'mch-update', {
      type: 'growth',
      message: 'Child growth parameters recorded!'
    })

    revalidatePath(`/dashboard/hospital/patients/${data.pregnancyId}/mch-book/child`)
    return { success: true }
  } catch (error) {
    console.error('Record child growth error:', error)
    return { success: false, error: 'Failed to record growth details' }
  }
}

/** Log when clinical staff opens a visiting patient's record from the national registry */
export async function logHospitalRegistryAccess(pregnancyId: string) {
  try {
    const { dbUser } = await requireClinicalStaff()
    if (!dbUser.hospitalId) return { success: false }

    const pregnancy = await db.query.pregnancies.findFirst({
      where: eq(pregnancies.id, pregnancyId),
    })
    if (!pregnancy) return { success: false }

    const isVisiting = pregnancy.hospitalId !== dbUser.hospitalId
    if (!isVisiting) return { success: true, logged: false }

    const hospital = await db.query.hospitals.findFirst({
      where: eq(hospitals.id, dbUser.hospitalId),
    })

    await recordFacilityCareEvent({
      pregnancyId,
      staffUserId: dbUser.id,
      staffHospitalId: dbUser.hospitalId,
      action: 'registry_access',
      summary: `${hospital?.name || 'Facility'} opened her national MCH record for continuity of care`,
    })

    return { success: true, logged: true }
  } catch (err) {
    console.warn('logHospitalRegistryAccess:', err)
    return { success: false }
  }
}

export async function getPregnancyCareHistory(pregnancyId: string) {
  const { dbUser } = await requireClinicalStaff()
  if (!dbUser) throw new Error('Unauthorized')

  const history = await getHospitalCareHistory(pregnancyId, 50)
  const facilitySummary = await getCareHistoryFacilitySummary(pregnancyId)
  return JSON.parse(JSON.stringify({ history, facilitySummary }))
}

/**
 * Search all pregnant women nationally (cross-hospital registry)
 */
export async function searchGlobalPatients(queryText: string) {
  const user = await currentUser()
  if (!user) throw new Error('Unauthorized')

  // Verify clinical provider role
  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id)
  })

  if (!dbUser || !['hospital_staff', 'midwife', 'admin'].includes(dbUser.role)) {
    throw new Error('Not authorized to search patient registry')
  }

  const raw = queryText.trim()
  if (!raw || raw.length < 2) {
    return []
  }

  const cleanQuery = `%${raw}%`
  const digitsOnly = raw.replace(/\D/g, '')
  const phonePattern = digitsOnly.length >= 4 ? `%${digitsOnly}%` : null
  const idCompact = raw.replace(/-/g, '').toLowerCase()
  const idPattern = idCompact.length >= 4 ? `%${idCompact}%` : null

  try {
    const matchConditions = [
      ilike(users.firstName, cleanQuery),
      ilike(users.lastName, cleanQuery),
      ilike(users.email, cleanQuery),
      ilike(users.phone, cleanQuery),
      ilike(users.clerkId, cleanQuery),
      ilike(users.ghanaCardId, cleanQuery),
      sql`(${users.firstName} || ' ' || ${users.lastName}) ILIKE ${cleanQuery}`,
      sql`CAST(${users.id} AS TEXT) ILIKE ${cleanQuery}`,
    ]

    if (phonePattern) {
      matchConditions.push(
        sql`regexp_replace(COALESCE(${users.phone}, ''), '[^0-9]', '', 'g') LIKE ${phonePattern}`
      )
    }

    if (idPattern) {
      matchConditions.push(
        sql`REPLACE(LOWER(CAST(${users.id} AS TEXT)), '-', '') LIKE ${idPattern}`
      )
    }

    const matchingPatients = await db.query.users.findMany({
      where: and(eq(users.role, 'pregnant_woman'), or(...matchConditions)),
      limit: 25,
    })

    const results = []

    for (const patient of matchingPatients) {
      let pregnancy = await db.query.pregnancies.findFirst({
        where: and(eq(pregnancies.userId, patient.id), eq(pregnancies.status, 'active')),
      })

      if (!pregnancy) {
        pregnancy = await db.query.pregnancies.findFirst({
          where: eq(pregnancies.userId, patient.id),
          orderBy: [desc(pregnancies.createdAt)],
        })
      }

      const onboardingHospital = pregnancy
        ? await db.query.hospitals.findFirst({
            where: eq(hospitals.id, pregnancy.hospitalId),
          })
        : null

      let facilityCount = 0
      let lastFacilityName: string | null = null
      if (pregnancy?.id) {
        const summary = await getCareHistoryFacilitySummary(pregnancy.id)
        facilityCount = summary.length
        lastFacilityName = summary[0]?.hospitalName ?? null
      }

      results.push({
        id: patient.id,
        name: `${patient.firstName} ${patient.lastName}`.trim() || patient.email,
        email: patient.email,
        phone: patient.phone,
        clerkId: patient.clerkId,
        ghanaCardId: patient.ghanaCardId,
        pregnancyId: pregnancy?.id ?? null,
        pregnancyStatus: pregnancy?.status ?? null,
        onboardedHospitalName: onboardingHospital?.name ?? 'Not assigned',
        onboardedHospitalLocation: onboardingHospital
          ? `${onboardingHospital.city}, ${onboardingHospital.region}`
          : '—',
        facilitiesInHistory: facilityCount,
        lastCareFacility: lastFacilityName,
      })
    }

    return JSON.parse(JSON.stringify(results))
  } catch (error) {
    console.error('searchGlobalPatients error:', error)
    return []
  }
}

function escapeCsvCell(value: unknown): string {
  if (value == null) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/**
 * Export patients registered at the logged-in user's hospital (CSV).
 * Server-side auth only — no cross-hospital data unless admin with hospital scope.
 */
export async function exportHospitalPatientsCsv(): Promise<{
  success: boolean
  csv?: string
  filename?: string
  error?: string
}> {
  try {
    const { dbUser } = await requireClinicalStaff()

    if (!dbUser.hospitalId) {
      return {
        success: false,
        error: 'Link your account to a hospital before exporting patient data.',
      }
    }

    const hospital = await db.query.hospitals.findFirst({
      where: eq(hospitals.id, dbUser.hospitalId),
    })

    const activePregnancies = await db.query.pregnancies.findMany({
      where: and(
        eq(pregnancies.hospitalId, dbUser.hospitalId),
        eq(pregnancies.status, 'active')
      ),
      orderBy: [desc(pregnancies.createdAt)],
      limit: 500,
    })

    const patientIds = [...new Set(activePregnancies.map((p) => p.userId))]
    const patientUsers =
      patientIds.length > 0
        ? await db.query.users.findMany({
            where: inArray(users.id, patientIds),
          })
        : []
    const patientById = new Map(patientUsers.map((u) => [u.id, u]))

    const headers = [
      'Patient Name',
      'Email',
      'Phone',
      'Patient ID',
      'Gestational Age (weeks)',
      'LMP',
      'EDD',
      'Blood Type',
      'Pregnancy Status',
      'Assigned Staff',
    ]

    const rows: string[][] = []

    for (const preg of activePregnancies) {
      const patient = patientById.get(preg.userId)
      let staffName = ''
      if (preg.midwifeId) {
        const staff = await db.query.users.findFirst({
          where: eq(users.id, preg.midwifeId),
        })
        if (staff) staffName = `${staff.firstName} ${staff.lastName}`.trim()
      }

      const ga = preg.gestationalAge ?? calcGestationalAgeWeeks(preg.lmp)
      const blood =
        preg.bloodType && preg.rhesusFactor
          ? `${preg.bloodType} (${preg.rhesusFactor})`
          : preg.bloodType || ''

      rows.push([
        patient ? `${patient.firstName} ${patient.lastName}`.trim() : '',
        patient?.email ?? '',
        patient?.phone ?? '',
        patient?.id ?? preg.userId,
        String(ga),
        preg.lmp ? new Date(preg.lmp).toISOString().slice(0, 10) : '',
        preg.edd ? new Date(preg.edd).toISOString().slice(0, 10) : '',
        blood,
        preg.status ?? '',
        staffName,
      ])
    }

    const csvLines = [
      headers.map(escapeCsvCell).join(','),
      ...rows.map((row) => row.map(escapeCsvCell).join(',')),
    ]

    const hospitalSlug = (hospital?.name || 'hospital')
      .replace(/[^a-z0-9]+/gi, '-')
      .toLowerCase()
      .slice(0, 40)
    const dateStamp = new Date().toISOString().slice(0, 10)

    return {
      success: true,
      csv: csvLines.join('\n'),
      filename: `maternalcare-${hospitalSlug}-patients-${dateStamp}.csv`,
    }
  } catch (err: unknown) {
    console.error('exportHospitalPatientsCsv error:', err)
    const message = err instanceof Error ? err.message : 'Export failed'
    return { success: false, error: message }
  }
}

/**
 * Submit a partnership request from a hospital seeking access
 */
export async function submitPartnershipRequest(data: {
  hospitalName: string
  email: string
  phone: string
  city: string
  region: string
  notes?: string
}) {
  try {
    await db.insert(partnershipRequests).values({
      hospitalName: data.hospitalName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      city: data.city.trim(),
      region: data.region.trim(),
      notes: data.notes?.trim() || null,
      status: 'pending',
    })
    return { success: true }
  } catch (error) {
    console.error('submitPartnershipRequest error:', error)
    return { success: false, error: 'Failed to submit partnership request' }
  }
}

/**
 * Approve a partnership request and automatically send a hospital sign-up invitation
 */
export async function approvePartnershipRequest(requestId: string) {
  try {
    const user = await currentUser()
    if (!user) throw new Error('Unauthorized')

    // 1. Verify admin role
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, user.id)
    })
    if (!dbUser || dbUser.role !== 'admin') {
      throw new Error('Only administrators can approve requests')
    }

    // 2. Fetch the request
    const request = await db.query.partnershipRequests.findFirst({
      where: eq(partnershipRequests.id, requestId)
    })
    if (!request) throw new Error('Partnership request not found')

    // 3. Invite the hospital using existing inviteHospital logic
    const inviteRes = await inviteHospital(request.email, request.hospitalName)
    if (!inviteRes.success) {
      throw new Error(inviteRes.error || 'Failed to send registration invite')
    }

    // 4. Update the partnership request status to 'approved'
    await db.update(partnershipRequests)
      .set({ status: 'approved' })
      .where(eq(partnershipRequests.id, requestId))

    revalidatePath('/dashboard/admin')
    return { success: true }
  } catch (error: any) {
    console.error('approvePartnershipRequest error:', error)
    return { success: false, error: error?.message || 'Failed to approve request' }
  }
}

// --- MCH Book Extra Checklists ---
export async function updateMCHChecklists(pregnancyId: string, mchDataUpdate: any) {
  try {
    await ensureMCHSchema()
    const user = await currentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, user.id),
    })
    if (dbUser?.role === 'father') {
      return { success: false, error: 'Read-only partner view cannot edit the MCH book' }
    }

    const existing = await db.query.pregnancies.findFirst({
      where: eq(pregnancies.id, pregnancyId)
    })
    
    if (!existing) return { success: false, error: 'Pregnancy not found' }

    const currentMchData = existing.mchData || {}
    const newMchData = { ...currentMchData, ...mchDataUpdate }

    await db.update(pregnancies)
      .set({ mchData: newMchData })
      .where(eq(pregnancies.id, pregnancyId))

    await notifyPregnancyUpdate(pregnancyId, 'Your MCH record book was updated by your care team.')
    revalidatePregnancyPaths(pregnancyId)

    return { success: true }
  } catch (err: unknown) {
    console.error('Failed to update MCH Checklists:', err)
    const message = err instanceof Error ? err.message : 'Update failed'
    return { success: false, error: message }
  }
}

const VALID_BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

function parseCombinedBloodType(combined: string): {
  bloodType: string
  rhesusFactor: 'Positive' | 'Negative' | null
} {
  const match = combined.match(/^(A|B|AB|O)(\+|-)$/)
  if (match) {
    return {
      bloodType: match[1],
      rhesusFactor: match[2] === '+' ? 'Positive' : 'Negative',
    }
  }
  return { bloodType: combined, rhesusFactor: null }
}

/** Update patient blood type and Rh factor on the active pregnancy record */
export async function updatePregnancyBloodType(pregnancyId: string, combinedBloodType: string) {
  try {
    const { dbUser } = await requireClinicalStaff()
    await ensureMCHSchema()

    const trimmed = combinedBloodType.trim()
    if (!trimmed || !VALID_BLOOD_TYPES.includes(trimmed as (typeof VALID_BLOOD_TYPES)[number])) {
      return { success: false, error: 'Please select a valid blood type (A+, O-, etc.).' }
    }

    const pregnancy = await db.query.pregnancies.findFirst({
      where: eq(pregnancies.id, pregnancyId),
    })
    if (!pregnancy) return { success: false, error: 'Pregnancy not found' }

    if (dbUser.role !== 'admin' && !['hospital_staff', 'midwife'].includes(dbUser.role)) {
      return { success: false, error: 'Not authorized for this patient' }
    }

    const { bloodType, rhesusFactor } = parseCombinedBloodType(trimmed)

    await db
      .update(pregnancies)
      .set({
        bloodType,
        rhesusFactor,
        updatedAt: new Date(),
      })
      .where(eq(pregnancies.id, pregnancyId))

    await notifyPregnancyUpdate(
      pregnancyId,
      `Your blood type was updated to ${trimmed} in your medical record.`,
      'mch-update'
    )
    await recordFacilityCareEvent({
      pregnancyId,
      staffUserId: dbUser.id,
      staffHospitalId: dbUser.hospitalId,
      action: 'blood_type_update',
      summary: `Blood type set to ${trimmed}`,
    })
    revalidatePregnancyPaths(pregnancyId)
    revalidatePath('/dashboard/hospital')

    return { success: true, bloodType, rhesusFactor, display: trimmed }
  } catch (err: unknown) {
    console.error('updatePregnancyBloodType error:', err)
    const message = err instanceof Error ? err.message : 'Failed to update blood type'
    return { success: false, error: message }
  }
}

/** Update patient age (stored as date of birth on the user record) */
export async function updatePatientAge(patientUserId: string, ageYears: number) {
  try {
    const { dbUser } = await requireClinicalStaff()
    await ensureMCHSchema()

    const age = Math.floor(Number(ageYears))
    if (Number.isNaN(age) || age < 10 || age > 60) {
      return { success: false, error: 'Please enter a valid age between 10 and 60 years.' }
    }

    const patient = await db.query.users.findFirst({
      where: eq(users.id, patientUserId),
    })
    if (!patient) return { success: false, error: 'Patient not found' }

    const pregnancy = await db.query.pregnancies.findFirst({
      where: and(eq(pregnancies.userId, patientUserId), eq(pregnancies.status, 'active')),
    })
    if (!pregnancy) {
      return { success: false, error: 'No active pregnancy record for this patient.' }
    }

    if (dbUser.role !== 'admin' && !['hospital_staff', 'midwife'].includes(dbUser.role)) {
      return { success: false, error: 'Not authorized for this patient' }
    }

    const dateOfBirth = dateOfBirthFromAge(age)

    await db
      .update(users)
      .set({
        dateOfBirth,
        updatedAt: new Date(),
      })
      .where(eq(users.id, patientUserId))

    await notifyPatientForPregnancy(
      pregnancy.id,
      `Your age on file was updated to ${age} years.`,
      'clinical_update',
      'mch-update'
    )
    await recordFacilityCareEvent({
      pregnancyId: pregnancy.id,
      staffUserId: dbUser.id,
      staffHospitalId: dbUser.hospitalId,
      action: 'medical_update',
      summary: `Patient age updated to ${age} years`,
    })
    revalidatePregnancyPaths(pregnancy.id)
    revalidatePath('/dashboard/hospital')

    return { success: true, age, dateOfBirth: dateOfBirth.toISOString() }
  } catch (err: unknown) {
    console.error('updatePatientAge error:', err)
    const message = err instanceof Error ? err.message : 'Failed to update age'
    return { success: false, error: message }
  }
}

/** Update patient Ghana Card ID */
export async function updatePatientGhanaCardId(patientUserId: string, ghanaCardId: string) {
  try {
    const { dbUser } = await requireClinicalStaff()
    await ensureMCHSchema()

    const cleanCardId = ghanaCardId.trim().toUpperCase()
    if (!cleanCardId) {
      return { success: false, error: 'Ghana Card ID cannot be empty.' }
    }

    // Check uniqueness
    const existing = await db.query.users.findFirst({
      where: and(eq(users.ghanaCardId, cleanCardId), ne(users.id, patientUserId)),
    })
    if (existing) {
      return { success: false, error: 'This Ghana Card ID is already registered to another patient.' }
    }

    const patient = await db.query.users.findFirst({
      where: eq(users.id, patientUserId),
    })
    if (!patient) return { success: false, error: 'Patient not found' }

    const pregnancy = await db.query.pregnancies.findFirst({
      where: and(eq(pregnancies.userId, patientUserId), eq(pregnancies.status, 'active')),
    })
    if (!pregnancy) {
      return { success: false, error: 'No active pregnancy record for this patient.' }
    }

    await db
      .update(users)
      .set({
        ghanaCardId: cleanCardId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, patientUserId))

    await notifyPatientForPregnancy(
      pregnancy.id,
      `Your Ghana Card ID was updated to ${cleanCardId}.`,
      'clinical_update',
      'mch-update'
    )
    await recordFacilityCareEvent({
      pregnancyId: pregnancy.id,
      staffUserId: dbUser.id,
      staffHospitalId: dbUser.hospitalId,
      action: 'medical_update',
      summary: `Patient Ghana Card ID updated to ${cleanCardId}`,
    })
    revalidatePregnancyPaths(pregnancy.id)
    revalidatePath('/dashboard/hospital')

    return { success: true, ghanaCardId: cleanCardId }
  } catch (err: unknown) {
    console.error('updatePatientGhanaCardId error:', err)
    const message = err instanceof Error ? err.message : 'Failed to update Ghana Card ID'
    return { success: false, error: message }
  }
}


/** Assign midwife or hospital staff as primary care contact (chat + coordination) */
export async function assignMidwifeToPregnancy(pregnancyId: string, staffId: string) {
  try {
    const { dbUser } = await requireClinicalStaff()

    const pregnancy = await db.query.pregnancies.findFirst({
      where: eq(pregnancies.id, pregnancyId),
    })
    if (!pregnancy) return { success: false, error: 'Pregnancy not found' }

    const staff = await db.query.users.findFirst({
      where: eq(users.id, staffId),
    })
    if (
      !staff ||
      (staff.role !== 'midwife' && staff.role !== 'hospital_staff') ||
      (staff.hospitalId && staff.hospitalId !== dbUser.hospitalId && dbUser.role !== 'admin')
    ) {
      return { success: false, error: 'Invalid care team member' }
    }

    await db.update(pregnancies).set({ midwifeId: staffId }).where(eq(pregnancies.id, pregnancyId))

    await notifyPregnancyUpdate(
      pregnancyId,
      `${staff.firstName} ${staff.lastName} is now your primary care contact for messages.`
    )
    revalidatePregnancyPaths(pregnancyId)
    revalidatePath('/dashboard/hospital')
    return { success: true }
  } catch (err: unknown) {
    console.error('Failed to assign care staff:', err)
    const message = err instanceof Error ? err.message : 'Assignment failed'
    return { success: false, error: message }
  }
}

/** Schedule a future antenatal visit for a patient */
export async function scheduleNextVisit(
  pregnancyId: string,
  scheduledDate: string,
  notes?: string
) {
  try {
    const { dbUser } = await requireClinicalStaff()

    const pregnancy = await db.query.pregnancies.findFirst({
      where: eq(pregnancies.id, pregnancyId),
    })
    if (!pregnancy) return { success: false, error: 'Pregnancy not found' }

    if (dbUser.role !== 'admin' && !['hospital_staff', 'midwife'].includes(dbUser.role)) {
      return { success: false, error: 'Not authorized for this patient' }
    }
    if (!dbUser.hospitalId && dbUser.role !== 'admin') {
      return { success: false, error: 'Link your account to a hospital first' }
    }

    const visitDate = new Date(scheduledDate)
    if (Number.isNaN(visitDate.getTime())) {
      return { success: false, error: 'Invalid date' }
    }

    const [created] = await db.insert(appointments).values({
      pregnancyId,
      hospitalId: dbUser.hospitalId || pregnancy.hospitalId,
      midwifeId: pregnancy.midwifeId ?? dbUser.id,
      scheduledDate: visitDate,
      status: 'scheduled',
      notes: notes?.trim() || 'Scheduled by hospital',
    }).returning()

    await notifyPatientForPregnancy(
      pregnancyId,
      `Your next clinic visit is scheduled for ${visitDate.toLocaleDateString()}.`,
      'appointment',
      'appointment'
    )
    await recordFacilityCareEvent({
      pregnancyId,
      staffUserId: dbUser.id,
      staffHospitalId: dbUser.hospitalId,
      action: 'appointment_scheduled',
      summary: `Visit scheduled for ${visitDate.toLocaleDateString()}`,
    })
    revalidatePregnancyPaths(pregnancyId)
    revalidatePath('/dashboard/hospital')

    return { success: true, appointment: created }
  } catch (err: unknown) {
    console.error('scheduleNextVisit error:', err)
    return { success: false, error: 'Failed to schedule visit' }
  }
}

/** Fetch notifications for the logged-in patient */
export async function getPatientNotifications() {
  const user = await currentUser()
  if (!user) return []

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id),
  })
  if (!dbUser) return []

  return db.query.notifications.findMany({
    where: eq(notifications.userId, dbUser.id),
    orderBy: [desc(notifications.createdAt)],
    limit: 50,
  })
}

export async function markNotificationsRead(notificationIds?: string[]) {
  const user = await currentUser()
  if (!user) return { success: false }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id),
  })
  if (!dbUser) return { success: false }

  if (notificationIds?.length) {
    for (const id of notificationIds) {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, id), eq(notifications.userId, dbUser.id)))
    }
  } else {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, dbUser.id))
  }

  revalidatePath('/dashboard/pregnant-woman')
  return { success: true }
}

/** Active hospitals for locator (optional user coordinates for sorting) */
export async function getHospitalsForLocator(userLat?: number, userLng?: number) {
  await ensureMCHSchema()

  const list = await db.query.hospitals.findMany({
    where: eq(hospitals.isActive, true),
    orderBy: [asc(hospitals.name)],
  })

  const withDistance = list.map((h) => {
    let distanceKm: number | null = null
    const lat = h.latitude != null ? parseFloat(String(h.latitude)) : null
    const lng = h.longitude != null ? parseFloat(String(h.longitude)) : null

    if (
      userLat != null &&
      userLng != null &&
      lat != null &&
      lng != null &&
      !Number.isNaN(lat) &&
      !Number.isNaN(lng)
    ) {
      const R = 6371
      const dLat = ((lat - userLat) * Math.PI) / 180
      const dLon = ((lng - userLng) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((userLat * Math.PI) / 180) *
          Math.cos((lat * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2
      distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    }

    return {
      ...h,
      distanceKm,
    }
  })

  withDistance.sort((a, b) => {
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm
    if (a.distanceKm != null) return -1
    if (b.distanceKm != null) return 1
    return a.name.localeCompare(b.name)
  })

  return JSON.parse(JSON.stringify(withDistance))
}

/** Hospital admin adds midwife or hospital staff via Clerk invite + DB record */
export async function addHospitalStaffMember(formData: {
  firstName: string
  lastName: string
  email: string
  phone?: string
  role: 'midwife' | 'hospital_staff'
}) {
  try {
    const { dbUser } = await requireClinicalStaff()
    if (!dbUser.hospitalId) {
      return { success: false, error: 'Complete your hospital profile before adding staff.' }
    }

    const emailLower = formData.email.trim().toLowerCase()
    const existing = await db.query.users.findFirst({
      where: eq(users.email, emailLower),
    })

    if (existing) {
      await db
        .update(users)
        .set({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone || existing.phone,
          role: formData.role,
          hospitalId: dbUser.hospitalId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id))
    } else {
      const inviteToken = `INV-STAFF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      await db.insert(users).values({
        clerkId: inviteToken,
        email: emailLower,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone || null,
        role: formData.role,
        hospitalId: dbUser.hospitalId,
        isVerified: false,
      })
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://maternalcareplus.vercel.app'
    try {
      const client = await clerkClient()
      await client.invitations.createInvitation({
        emailAddress: emailLower,
        redirectUrl: `${origin}/sign-up`,
        publicMetadata: {
          role: formData.role,
          hospitalId: dbUser.hospitalId,
          phone: formData.phone || '',
        },
        ignoreExisting: true,
      })
    } catch (clerkErr) {
      console.warn('[addHospitalStaffMember] Clerk invite warning:', clerkErr)
    }

    revalidatePath('/dashboard/hospital')
    return { success: true }
  } catch (err: unknown) {
    console.error('addHospitalStaffMember error:', err)
    const message = err instanceof Error ? err.message : 'Failed to add staff'
    return { success: false, error: message }
  }
}

/** Deactivates clinical staff and revokes their Clerk access account */
export async function removeHospitalStaffMember(staffUserId: string) {
  try {
    const { dbUser } = await requireClinicalStaff()
    if (!dbUser.hospitalId) {
      return { success: false, error: 'Complete your hospital profile first.' }
    }

    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, staffUserId),
    })

    if (!targetUser) {
      return { success: false, error: 'Staff member not found.' }
    }

    if (targetUser.hospitalId !== dbUser.hospitalId) {
      return { success: false, error: 'You are not authorized to delete staff from another facility.' }
    }

    // Attempt to delete from Clerk if they have a fully registered account
    if (targetUser.clerkId && targetUser.clerkId.startsWith('user_')) {
      try {
        const client = await clerkClient()
        await client.users.deleteUser(targetUser.clerkId)
      } catch (clerkErr) {
        console.warn('[removeHospitalStaffMember] Clerk user delete warning:', clerkErr)
      }
    }

    // Set user to inactive and disconnect hospital to maintain historic care logs
    await db
      .update(users)
      .set({
        isActive: false,
        hospitalId: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, staffUserId))

    revalidatePath('/dashboard/hospital')
    return { success: true }
  } catch (err: unknown) {
    console.error('removeHospitalStaffMember error:', err)
    return { success: false, error: 'Failed to delete staff member' }
  }
}

/** Generates a time-limited 6-digit daily shift code for clinical staff login */
export async function generateHospitalShiftCode() {
  try {
    const { dbUser } = await requireClinicalStaff()
    if (!dbUser.hospitalId) {
      return { success: false, error: 'Complete your hospital profile first.' }
    }

    // Limit code generation to hospital staff / administrators
    if (dbUser.role !== 'hospital_staff' && dbUser.role !== 'admin') {
      return { success: false, error: 'Only hospital administrators can generate shift codes.' }
    }

    // Generate random 6-digit shift code
    const shiftCode = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Code expires at the end of today (23:59:59.999 local/server time)
    const expiresAt = new Date()
    expiresAt.setHours(23, 59, 59, 999)

    await db
      .update(hospitals)
      .set({
        shiftCode,
        shiftCodeExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(hospitals.id, dbUser.hospitalId))

    revalidatePath('/dashboard/hospital')
    return { success: true, shiftCode }
  } catch (err: unknown) {
    console.error('generateHospitalShiftCode error:', err)
    return { success: false, error: 'Failed to generate shift code' }
  }
}

/** Verifies a daily shift code submitted by a midwife or staff member */
export async function verifyHospitalShiftCode(code: string) {
  try {
    const user = await currentUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, user.id),
    })

    if (!dbUser) return { success: false, error: 'User profile not found in database' }
    if (!dbUser.hospitalId) return { success: false, error: 'You are not linked to any hospital.' }

    const hospital = await db.query.hospitals.findFirst({
      where: eq(hospitals.id, dbUser.hospitalId),
    })

    if (!hospital) return { success: false, error: 'Hospital record not found' }

    if (!hospital.shiftCode || !hospital.shiftCodeExpiresAt) {
      return { success: false, error: 'No shift code has been generated by your hospital today. Please contact your hospital administrator.' }
    }

    if (new Date() > new Date(hospital.shiftCodeExpiresAt)) {
      return { success: false, error: 'The shift code has expired. Please ask your administrator to generate a new code.' }
    }

    if (hospital.shiftCode !== code.trim()) {
      return { success: false, error: 'Incorrect shift code. Please try again.' }
    }

    // Set code and timestamp verified
    await db
      .update(users)
      .set({
        lastShiftCodeVerified: code.trim(),
        lastShiftCodeVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, dbUser.id))

    // Record login entry in staffLoginLogs
    const [newLog] = await db.insert(staffLoginLogs).values({
      userId: dbUser.id,
      hospitalId: dbUser.hospitalId,
      loginTime: new Date(),
      status: 'active',
    }).returning({ id: staffLoginLogs.id })

    revalidatePath('/dashboard/hospital')
    revalidatePath('/dashboard/midwife')

    return { success: true, logId: newLog?.id }
  } catch (err: unknown) {
    console.error('verifyHospitalShiftCode error:', err)
    return { success: false, error: 'Verification failed' }
  }
}

/** Logs a midwife or staff out and clears session state in database */
export async function logStaffSessionEnd(durationSeconds?: number) {
  try {
    const user = await currentUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, user.id),
    })

    if (!dbUser) return { success: false, error: 'User not found' }

    // Find the latest active log for this user
    const latestActiveLog = await db.query.staffLoginLogs.findFirst({
      where: and(
        eq(staffLoginLogs.userId, dbUser.id),
        eq(staffLoginLogs.status, 'active')
      ),
      orderBy: desc(staffLoginLogs.loginTime),
    })

    if (latestActiveLog) {
      const logoutTime = new Date()
      let duration = durationSeconds
      if (!duration) {
        duration = Math.max(0, Math.floor((logoutTime.getTime() - latestActiveLog.loginTime.getTime()) / 1000))
      }

      await db
        .update(staffLoginLogs)
        .set({
          logoutTime,
          sessionDuration: duration,
          status: 'logged_out',
        })
        .where(eq(staffLoginLogs.id, latestActiveLog.id))
    }

    // Reset user shift code verification status in DB so they have to verify again on next login
    await db
      .update(users)
      .set({
        lastShiftCodeVerified: null,
        lastShiftCodeVerifiedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, dbUser.id))

    revalidatePath('/dashboard/hospital')
    revalidatePath('/dashboard/midwife')
    return { success: true }
  } catch (err: unknown) {
    console.error('logStaffSessionEnd error:', err)
    return { success: false, error: 'Failed to record logout' }
  }
}

/** Fetches the daily duty and session history logs for all staff linked to this hospital */
export async function getHospitalStaffLoginHistory() {
  try {
    const { dbUser } = await requireClinicalStaff()
    if (!dbUser.hospitalId) {
      return []
    }

    const logs = await db
      .select({
        id: staffLoginLogs.id,
        loginTime: staffLoginLogs.loginTime,
        logoutTime: staffLoginLogs.logoutTime,
        sessionDuration: staffLoginLogs.sessionDuration,
        status: staffLoginLogs.status,
        staffName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
        staffRole: users.role,
        staffEmail: users.email,
      })
      .from(staffLoginLogs)
      .innerJoin(users, eq(staffLoginLogs.userId, users.id))
      .where(eq(staffLoginLogs.hospitalId, dbUser.hospitalId))
      .orderBy(desc(staffLoginLogs.loginTime))
      .limit(50)

    return JSON.parse(JSON.stringify(logs))
  } catch (err: unknown) {
    console.error('getHospitalStaffLoginHistory error:', err)
    return []
  }
}

/**
 * Force sign out a clinical staff member (e.g. by hospital admin)
 */
export async function forceSignOutStaffSession(logId: string) {
  try {
    const { dbUser } = await requireClinicalStaff()
    if (dbUser.role !== 'hospital_staff' && dbUser.role !== 'admin') {
      return { success: false, error: 'Only hospital administrators can sign out staff.' }
    }

    // Find the login log
    const log = await db.query.staffLoginLogs.findFirst({
      where: eq(staffLoginLogs.id, logId)
    })

    if (!log) {
      return { success: false, error: 'Shift record not found.' }
    }

    // Enforce facility boundary
    if (log.hospitalId !== dbUser.hospitalId) {
      return { success: false, error: 'Unauthorized facility access.' }
    }

    if (log.status !== 'active') {
      return { success: true, message: 'Shift is already ended.' }
    }

    const logoutTime = new Date()
    const duration = Math.max(0, Math.floor((logoutTime.getTime() - log.loginTime.getTime()) / 1000))

    // Update session log
    await db
      .update(staffLoginLogs)
      .set({
        logoutTime,
        sessionDuration: duration,
        status: 'logged_out',
      })
      .where(eq(staffLoginLogs.id, logId))

    // Reset user's daily shift verification state
    await db
      .update(users)
      .set({
        lastShiftCodeVerified: null,
        lastShiftCodeVerifiedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, log.userId))

    revalidatePath('/dashboard/hospital')
    revalidatePath('/dashboard/midwife')

    return { success: true }
  } catch (err: unknown) {
    console.error('forceSignOutStaffSession error:', err)
    return { success: false, error: 'Failed to force sign out staff' }
  }
}

/**
 * Generates system-wide monthly clinical and duty audit reports for administrators
 */
export async function getMonthlyAuditReport(year: number, month: number) {
  try {
    const user = await currentUser()
    if (!user) throw new Error('Unauthorized')

    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, user.id),
    })

    if (!dbUser || dbUser.role !== 'admin') {
      throw new Error('Only central administrators can access system-wide audit reports.')
    }

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 1)

    // 1. Fetch clinical encounters for the month
    const encountersRaw = await db
      .select({
        id: hospitalCareEncounters.id,
        action: hospitalCareEncounters.action,
        summary: hospitalCareEncounters.summary,
        createdAt: hospitalCareEncounters.createdAt,
        isVisitingFacility: hospitalCareEncounters.isVisitingFacility,
        staffUserId: hospitalCareEncounters.staffUserId,
        patientName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
        patientEmail: users.email,
        hospitalName: hospitals.name,
      })
      .from(hospitalCareEncounters)
      .innerJoin(users, eq(hospitalCareEncounters.patientUserId, users.id))
      .innerJoin(hospitals, eq(hospitalCareEncounters.hospitalId, hospitals.id))
      .where(
        and(
          gte(hospitalCareEncounters.createdAt, startDate),
          lt(hospitalCareEncounters.createdAt, endDate)
        )
      )
      .orderBy(desc(hospitalCareEncounters.createdAt))

    // 2. Fetch staff duty logs for the month
    const staffLogs = await db
      .select({
        id: staffLoginLogs.id,
        loginTime: staffLoginLogs.loginTime,
        logoutTime: staffLoginLogs.logoutTime,
        sessionDuration: staffLoginLogs.sessionDuration,
        status: staffLoginLogs.status,
        staffName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
        staffRole: users.role,
        staffEmail: users.email,
        hospitalName: hospitals.name,
      })
      .from(staffLoginLogs)
      .innerJoin(users, eq(staffLoginLogs.userId, users.id))
      .innerJoin(hospitals, eq(staffLoginLogs.hospitalId, hospitals.id))
      .where(
        and(
          gte(staffLoginLogs.loginTime, startDate),
          lt(staffLoginLogs.loginTime, endDate)
        )
      )
      .orderBy(desc(staffLoginLogs.loginTime))

    // 3. Fetch all clinical staff names for quick lookup mapping
    const staffProfiles = await db
      .select({
        id: users.id,
        name: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
        role: users.role,
      })
      .from(users)

    const staffMap = new Map(staffProfiles.map((s) => [s.id, s]))

    const encounters = encountersRaw.map((enc) => {
      const staff = enc.staffUserId ? staffMap.get(enc.staffUserId) : null
      return {
        ...enc,
        staffName: staff ? staff.name : 'Unknown/System',
        staffRole: staff ? staff.role : 'System',
      }
    })

    // 4. Monthly metrics summaries
    const newPregnanciesCount = await db
      .select({ count: sql`count(*)` })
      .from(pregnancies)
      .where(
        and(
          gte(pregnancies.createdAt, startDate),
          lt(pregnancies.createdAt, endDate)
        )
      )

    const completedLabsCount = await db
      .select({ count: sql`count(*)` })
      .from(labTests)
      .where(
        and(
          gte(labTests.resultDate, startDate),
          lt(labTests.resultDate, endDate),
          eq(labTests.status, 'completed')
        )
      )

    const criticalAlertsCount = await db
      .select({ count: sql`count(*)` })
      .from(labTests)
      .where(
        and(
          gte(labTests.resultDate, startDate),
          lt(labTests.resultDate, endDate),
          or(eq(labTests.status, 'abnormal'), eq(labTests.status, 'critical'))
        )
      )

    return JSON.parse(
      JSON.stringify({
        encounters,
        staffLogs,
        metrics: {
          encountersCount: encounters.length,
          staffLogsCount: staffLogs.length,
          newPregnancies: Number(newPregnanciesCount[0]?.count || 0),
          completedLabs: Number(completedLabsCount[0]?.count || 0),
          criticalAlerts: Number(criticalAlertsCount[0]?.count || 0),
        },
      })
    )
  } catch (err: unknown) {
    console.error('getMonthlyAuditReport error:', err)
    return {
      encounters: [],
      staffLogs: [],
      metrics: {
        encountersCount: 0,
        staffLogsCount: 0,
        newPregnancies: 0,
        completedLabs: 0,
        criticalAlerts: 0,
      },
    }
  }
}

/**
 * Update NHIS and/or Private Insurance details for a user.
 * Called by the pregnant woman (self-service) or hospital staff updating a patient record.
 */
export async function updateNhisDetails({
  userId,
  nhisNumber,
  nhisExpiryDate,
  insuranceProvider,
  insurancePolicyNumber,
  insuranceExpiryDate,
}: {
  userId?: string
  nhisNumber?: string
  nhisExpiryDate?: string
  insuranceProvider?: string
  insurancePolicyNumber?: string
  insuranceExpiryDate?: string
}) {
  const clerkUser = await currentUser()
  if (!clerkUser) throw new Error('Unauthorized')

  const callerDb = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkUser.id),
  })
  if (!callerDb) throw new Error('User not found')

  // Staff can update any patient; the woman updates herself
  const targetId =
    userId && ['midwife', 'hospital_staff', 'admin'].includes(callerDb.role)
      ? userId
      : callerDb.id

  const updateFields: any = {
    updatedAt: new Date(),
  }

  if (nhisNumber !== undefined) {
    updateFields.nhisNumber = nhisNumber ? nhisNumber.trim() : null
  }
  if (nhisExpiryDate !== undefined) {
    updateFields.nhisExpiryDate = nhisExpiryDate ? new Date(nhisExpiryDate) : null
  }
  if (insuranceProvider !== undefined) {
    updateFields.insuranceProvider = insuranceProvider ? insuranceProvider.trim() : null
  }
  if (insurancePolicyNumber !== undefined) {
    updateFields.insurancePolicyNumber = insurancePolicyNumber ? insurancePolicyNumber.trim() : null
  }
  if (insuranceExpiryDate !== undefined) {
    updateFields.insuranceExpiryDate = insuranceExpiryDate ? new Date(insuranceExpiryDate) : null
  }

  await db
    .update(users)
    .set(updateFields)
    .where(eq(users.id, targetId))

  revalidatePath('/dashboard/pregnant-woman')
  revalidatePath('/dashboard/hospital')

  return { success: true }
}
