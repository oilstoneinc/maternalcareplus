import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/clerk'
import { db } from '@/lib/db'
import { ensureMCHSchema } from '@/lib/db/ensure-mch-schema'
import { users, pregnancies, appointments, vitalSigns, labTests, hospitals, deliveries, children } from '@/lib/db/schema'
import { eq, and, or, desc, ne } from 'drizzle-orm'
import PatientProfileClient from './patient-profile-client'
import { getHospitalCareHistory, getCareHistoryFacilitySummary } from '@/lib/hospital-care-history'
import { logHospitalRegistryAccess } from '@/app/actions'

export default async function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureMCHSchema()
    await requireRole(['hospital_staff', 'admin', 'midwife'])
    const user = await currentUser()
    
    // Resolve the promise for params in Next.js 15+
    const resolvedParams = await params
    const pregnancyId = resolvedParams.id
    
    // Get db user to verify hospital access
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, user!.id),
    })

    if (!dbUser || !dbUser.hospitalId) {
      redirect('/unauthorized')
    }

    // Fetch the pregnancy (relaxed to allow cross-hospital registry tracking for verified staff)
    const pregnancy = await db.query.pregnancies.findFirst({
      where: eq(pregnancies.id, pregnancyId)
    })

    if (!pregnancy) {
      redirect('/dashboard/hospital') // Not found or unauthorized
    }

    // Fetch the onboarding hospital
    const onboardingHospital = await db.query.hospitals.findFirst({
      where: eq(hospitals.id, pregnancy.hospitalId)
    })

    // Fetch the patient
    const patient = await db.query.users.findFirst({
      where: eq(users.id, pregnancy.userId)
    })

    if (!patient) {
      redirect('/dashboard/hospital')
    }

    // Fetch recent vitals
    const vitals = await db.query.vitalSigns.findMany({
      where: eq(vitalSigns.pregnancyId, pregnancyId),
      orderBy: [desc(vitalSigns.recordedDate)],
      limit: 10
    })

    // Fetch appointments
    const allAppointments = await db.query.appointments.findMany({
      where: eq(appointments.pregnancyId, pregnancyId),
      orderBy: [desc(appointments.scheduledDate)]
    })

    // Fetch labs
    const labs = await db.query.labTests.findMany({
      where: eq(labTests.pregnancyId, pregnancyId),
      orderBy: [desc(labTests.resultDate)]
    })

    // Fetch available midwives for this hospital
    const availableMidwives = await db.query.users.findMany({
      where: and(
        eq(users.hospitalId, dbUser.hospitalId),
        or(eq(users.role, 'midwife'), eq(users.role, 'hospital_staff'))
      ),
    })

    const isVisitingPatient = pregnancy.hospitalId !== dbUser.hospitalId
    if (isVisitingPatient) {
      await logHospitalRegistryAccess(pregnancyId)
    }

    const currentHospital = await db.query.hospitals.findFirst({
      where: eq(hospitals.id, dbUser.hospitalId),
    })

    const careHistory = await getHospitalCareHistory(pregnancyId, 50)
    const careFacilitySummary = await getCareHistoryFacilitySummary(pregnancyId)

    // Fetch all other pregnancies for this patient (history across pregnancies)
    let pastPregnancies: any[] = []
    try {
      const otherPregs = await db.query.pregnancies.findMany({
        where: and(eq(pregnancies.userId, patient.id), ne(pregnancies.id, pregnancyId)),
        orderBy: [desc(pregnancies.createdAt)],
      })
      for (const p of otherPregs) {
        const pH = await db.query.hospitals.findFirst({ where: eq(hospitals.id, p.hospitalId) }).catch(() => null)
        const pD = await db.query.deliveries.findFirst({ where: eq(deliveries.pregnancyId, p.id) }).catch(() => null)
        const pC = await db.query.children.findFirst({ where: eq(children.pregnancyId, p.id) }).catch(() => null)
        const pA = await db.query.appointments.findMany({ where: and(eq(appointments.pregnancyId, p.id), eq(appointments.status, 'completed')) }).catch(() => [])
        pastPregnancies.push({ ...p, hospital: pH || null, delivery: pD || null, child: pC || null, ancVisitCount: pA.length })
      }
    } catch (e) {
      console.error('Error fetching patient past pregnancies:', e)
    }

    const safeData = JSON.parse(JSON.stringify({
      pregnancy,
      patient,
      vitals,
      appointments: allAppointments,
      labs,
      onboardingHospital,
      currentHospitalId: dbUser.hospitalId,
      currentHospital,
      isVisitingPatient,
      availableMidwives,
      careHistory,
      careFacilitySummary,
      currentStaffId: dbUser.id,
      pastPregnancies,
    }))

    return <PatientProfileClient data={safeData} />
  } catch (error) {
    console.error('Patient Profile Error:', error)
    redirect('/dashboard/hospital')
  }
}
