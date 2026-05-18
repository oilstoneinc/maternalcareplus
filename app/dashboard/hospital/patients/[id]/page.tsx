import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/clerk'
import { db } from '@/lib/db'
import { users, pregnancies, appointments, vitalSigns, labTests, hospitals } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import PatientProfileClient from './patient-profile-client'

export default async function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['hospital_staff', 'admin'])
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

    // Prepare safe data
    const safeData = JSON.parse(JSON.stringify({
      pregnancy,
      patient,
      vitals,
      appointments: allAppointments,
      labs,
      onboardingHospital,
      currentHospitalId: dbUser.hospitalId
    }))

    return <PatientProfileClient data={safeData} />
  } catch (error) {
    console.error('Patient Profile Error:', error)
    redirect('/dashboard/hospital')
  }
}
