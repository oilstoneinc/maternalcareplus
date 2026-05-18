'use server'

import { db } from '@/lib/db'
import { users, pregnancies, appointments, labTests, partnerAccess, messages, User, NewUser, NewPregnancy, NewMessage, hospitals, vitalSigns, previousPregnancies, deliveries, postnatalCare, children, immunizations, childGrowth } from '@/lib/db/schema'
import { currentUser, clerkClient } from '@clerk/nextjs/server'
import { HospitalDashboardData, DashboardData, Message } from '@/types'
import { eq, desc, and, or, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { pusherServer } from '@/lib/pusher-server'

/**
 * Get data for the Patient (Pregnant Woman) Dashboard
 */
export async function getPatientDashboardData(): Promise<DashboardData | null> {
  try {
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
      return { user: dbUser, pregnancy: null, appointments: [], labs: [], vitals: [] }
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
        limit: 10,
      })
    } catch (e) {
      console.error('Error fetching recent vitals:', e)
    }

    // Get upcoming appointments
    let upcomingAppointments: any[] = []
    try {
      upcomingAppointments = await db.query.appointments.findMany({
        where: and(
          eq(appointments.pregnancyId, pregnancy.id),
          sql`${appointments.scheduledDate} >= NOW()`
        ),
        orderBy: [desc(appointments.scheduledDate)],
        limit: 5,
      })
    } catch (e) {
      console.error('Error fetching upcoming appointments:', e)
    }

    // Get recent lab results
    let recentLabs: any[] = []
    try {
      recentLabs = await db.query.labTests.findMany({
        where: eq(labTests.pregnancyId, pregnancy.id),
        orderBy: [desc(labTests.resultDate)],
        limit: 3,
      })
    } catch (e) {
      console.error('Error fetching recent lab tests:', e)
    }

    return {
      user: dbUser,
      pregnancy: pregnancyWithHospital,
      appointments: upcomingAppointments,
      labs: recentLabs,
      vitals: recentVitals,
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
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, user.id),
    })

    if (!dbUser) {
      console.log(`getHospitalDashboardData: No dbUser found for ${user.id}`)
      return null
    }
    
    if (dbUser.role !== 'hospital_staff' && dbUser.role !== 'admin') {
      console.warn(`Unauthorized role access attempt to hospital dashboard by ${user.id}, role is ${dbUser.role}`)
      return null
    }

    // Get all patients linked to this hospital
    const allPatients = await db.query.users.findMany({
      where: and(
        eq(users.role, 'pregnant_woman'),
        eq(users.hospitalId, dbUser.hospitalId!)
      ),
      limit: 50,
    })

    // Get active pregnancies for this hospital
    const activePregnanciesRaw = await db.query.pregnancies.findMany({
      where: and(
        eq(pregnancies.status, 'active'),
        eq(pregnancies.hospitalId, dbUser.hospitalId!)
      ),
      limit: 50,
    })

    // Map pregnancies to include patient name
    const activePregnancies = activePregnanciesRaw.map(p => {
      const patient = allPatients.find(u => u.id === p.userId)
      return {
        ...p,
        patientName: patient ? `${patient.firstName} ${patient.lastName}`.trim() : 'Unknown Patient',
        nextVisit: 'Not scheduled', // This could be fetched from appointments
        riskLevel: p.riskFactors?.length ? 'high' : 'low'
      }
    })

    // Get today's appointments for this hospital
    const todayAppointments = await db.query.appointments.findMany({
      where: and(
        sql`DATE(${appointments.scheduledDate}) = CURRENT_DATE`,
        eq(appointments.hospitalId, dbUser.hospitalId!)
      ),
      limit: 20,
    })

    // Get hospital details
    const hospital = dbUser.hospitalId ? await db.query.hospitals.findFirst({
      where: eq(hospitals.id, dbUser.hospitalId)
    }) : null;

    return {
      hospital,
      patients: allPatients,
      pregnancies: activePregnancies,
      appointments: todayAppointments,
    }
  } catch (error) {
    console.error('Error in getHospitalDashboardData:', error)
    return null
  }
}

/**
 * Get data for the Midwife Dashboard
 */
export async function getMidwifeDashboardData() {
  const user = await currentUser()
  if (!user) throw new Error('Unauthorized')

  // Get midwife record
  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id),
  })

  if (!dbUser || dbUser.role !== 'midwife' && dbUser.role !== 'admin') {
    throw new Error('Unauthorized role')
  }

  // Get assigned patients/pregnancies (mocking for now, could be via a 'assignedMidwifeId' field)
  const patients = await db.query.users.findMany({
    where: eq(users.role, 'pregnant_woman'),
    limit: 20,
  })

  // Get recent messages
  // const recentMessages = ...

  return {
    midwife: dbUser,
    patients,
  }
}


/**
 * Get data for the Father Dashboard
 */
export async function getFatherDashboardData() {
  const user = await currentUser()
  if (!user) throw new Error('Unauthorized')

  // Get father record
  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id),
  })

  if (!dbUser || dbUser.role !== 'father' && dbUser.role !== 'admin') {
    throw new Error('Unauthorized role')
  }

  // Get linked pregnancy via partner_access
  const access = await db.query.partnerAccess.findFirst({
    where: eq(partnerAccess.partnerId, dbUser.id),
  })

  // Fetch linked pregnancy separately to avoid Drizzle relation dependencies
  const pregnancy = access?.pregnancyId ? await db.query.pregnancies.findFirst({
    where: eq(pregnancies.id, access.pregnancyId)
  }) : null

  // Get upcoming appointments
  const upcomingAppointments = pregnancy?.id ? await db.query.appointments.findMany({
    where: eq(appointments.pregnancyId, pregnancy.id),
    orderBy: [desc(appointments.scheduledDate)],
    limit: 5,
  }) : []

  // Get lab results (User requested fathers see all)
  const labs = pregnancy?.id ? await db.query.labTests.findMany({
    where: eq(labTests.pregnancyId, pregnancy.id),
    orderBy: [desc(labTests.resultDate)],
    limit: 10
  }) : []

  return {
    user: dbUser,
    pregnancy,
    appointments: upcomingAppointments,
    labs
  }
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
  const userCounts = await db.select({
    role: users.role,
    count: sql`count(*)`,
  }).from(users).groupBy(users.role)

  return {
    user: dbUser,
    allUsers,
    allHospitals,
    userCounts,
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
 * Self-healing sync: Manually forces a synchronization of the Clerk user to the Neon database.
 * Use this when webhooks are late or failing.
 */
export async function syncClerkAccount() {
  try {
    const user = await currentUser()
    if (!user) return { success: false, error: 'No authenticated user' }

    const primaryEmail = user.emailAddresses[0]?.emailAddress
    if (!primaryEmail) return { success: false, error: 'No email found in Clerk' }

    // 1. Check if user exists in DB (source of truth for onboarded patients/midwives)
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, user.id)
    })

    // Prioritize DB role, then Clerk metadata role, then default fallback
    let role = dbUser?.role || (user.publicMetadata?.role as string) || null

    if (!role) {
      role = 'hospital_staff' // Default for first-time provider signups
    }

    if (!dbUser) {
      console.log(`Self-healing: Creating missing user record for ${user.id} with role ${role}`)
      await db.insert(users).values({
        clerkId: user.id,
        email: primaryEmail,
        firstName: user.firstName || 'User',
        lastName: user.lastName || '',
        role: role as any,
        isVerified: true,
        isActive: true,
      })
    } else if (dbUser.role !== role) {
       // DB is source of truth, synchronize Clerk metadata if they disagree
       console.log(`Self-healing: Clerk/DB mismatch. Database role is ${dbUser.role}, Clerk is ${role}. Syncing Clerk.`)
       role = dbUser.role
    }

    // Ensure Clerk is updated
    if (user.publicMetadata?.role !== role) {
      await (await clerkClient()).users.updateUserMetadata(user.id, {
        publicMetadata: { role: role }
      })
    }

    // 2. If it's a hospital staff role, ensure they have a hospital entry
    if (role === 'hospital_staff') {
      const existingHospital = await db.query.hospitals.findFirst({
        where: eq(hospitals.email, primaryEmail)
      })

      if (!existingHospital) {
        await db.insert(hospitals).values({
          name: user.firstName ? `${user.firstName}'s Medical Center` : `Pending Setup (${primaryEmail})`,
          code: `HSP-AUTO-${Math.floor(Math.random() * 10000)}`,
          address: 'Institutional Setup Pending',
          region: 'Unknown',
          city: 'Unknown',
          phone: '0000000000',
          email: primaryEmail,
          type: 'Hospital',
        })
      }
    }

    // 3. Determine precise target path for redirect
    let targetPath = '/dashboard'
    if (role === 'admin') targetPath = '/dashboard/admin'
    if (role === 'hospital_staff') targetPath = '/dashboard/hospital'
    if (role === 'midwife') targetPath = '/dashboard/midwife'
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
    // 2. Create the user in Clerk
    const client = await clerkClient()
    const tempPassword = formData.password || `MC${Math.random().toString(36).substring(2, 8).toUpperCase()}!2026`
    
    const newClerkUser = await client.users.createUser({
      firstName: formData.firstName,
      lastName: formData.lastName,
      emailAddress: [formData.email], // Note: array mapping
      password: tempPassword,
      publicMetadata: {
        role: formData.role || 'pregnant_woman',
        phone: formData.phone
      }
    })

    // 3. Upsert into our DB directly (avoiding race conditions with webhook)
    const [newUser] = await db.insert(users).values({
      clerkId: newClerkUser.id,
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      role: formData.role || 'pregnant_woman',
      address: formData.address,
      isVerified: true
    }).onConflictDoUpdate({
      target: users.clerkId,
      set: {
        firstName: formData.firstName,
        role: formData.role || 'pregnant_woman'
      }
    }).returning()

    // 4. Create Pregnancy record if applicable
    if ((formData.role || 'pregnant_woman') === 'pregnant_woman' && formData.lmp) {
      let hospitalId = dbUser.hospitalId;
      if (!hospitalId) {
        throw new Error('You must be assigned to a hospital to onboard a patient.')
      }

      await db.insert(pregnancies).values({
        userId: newUser.id,
        hospitalId: formData.hospitalId || hospitalId,
        gravidity: parseInt(formData.gravidity) || 1,
        parity: parseInt(formData.parity) || 0,
        lmp: new Date(formData.lmp),
        edd: new Date(new Date(formData.lmp).setDate(new Date(formData.lmp).getDate() + 280)), // Rule of thumb
        status: 'active',
      })
    }

    revalidatePath('/dashboard/hospital')
    return { 
      success: true, 
      data: {
        email: formData.email,
        password: tempPassword,
        loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/sign-in`
      } 
    }
  } catch (error: any) {
    console.error('Onboarding error:', error)
    return { success: false, error: error?.errors?.[0]?.message || 'Failed to onboard patient' }
  }
}

/**
 * Record an antenatal visit (midwife dashboard)
 */
export async function recordAntenatalVisit(formData: any) {
  const user = await currentUser()
  if (!user) throw new Error('Unauthorized')

  // Verify midwife role
  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id)
  })
  if (!dbUser || (dbUser.role !== 'midwife' && dbUser.role !== 'hospital_staff' && dbUser.role !== 'admin')) {
    throw new Error('Not authorized to record visits')
  }

  try {
    const pregnancyId = formData.pregnancyId
    const hospitalId = formData.hospitalId

    // 1. Update Pregnancy clinical history if provided
    if (formData.medicalHistory || formData.allergies || formData.medications || formData.bloodType) {
      await db.update(pregnancies)
        .set({
          medicalHistory: formData.medicalHistory || undefined,
          allergies: formData.allergies ? formData.allergies.split(',').map((s: string) => s.trim()) : undefined,
          medications: formData.medications ? formData.medications.split(',').map((s: string) => s.trim()) : undefined,
          bloodType: formData.bloodType || undefined,
          rhesusFactor: formData.rhesusFactor || undefined,
        })
        .where(eq(pregnancies.id, pregnancyId))
    }

    // 2. Record Vital Signs
    await db.insert(vitalSigns).values({
      pregnancyId: pregnancyId,
      recordedDate: new Date(),
      weight: formData.weight,
      bloodPressureSystolic: parseInt(formData.bpSystolic),
      bloodPressureDiastolic: parseInt(formData.bpDiastolic),
      heartRate: parseInt(formData.heartRate),
      recordedBy: dbUser.id,
      notes: formData.notes
    })

    // 3. Create or Update Appointment
    // If there is an existing appointment for today, we might want to update it.
    // For now, we'll just insert a completed one.
    await db.insert(appointments).values({
      pregnancyId: pregnancyId,
      hospitalId: hospitalId,
      midwifeId: dbUser.id,
      scheduledDate: new Date(),
      actualDate: new Date(),
      gestationalAge: parseInt(formData.gestationalAge),
      weight: formData.weight,
      bloodPressure: `${formData.bpSystolic}/${formData.bpDiastolic}`,
      fundalHeight: formData.fundalHeight,
      fetalHeartRate: parseInt(formData.fhr),
      presentation: formData.presentation,
      findings: formData.findings,
      recommendations: formData.recommendations,
      nextVisitDate: formData.nextVisitDate ? new Date(formData.nextVisitDate) : null,
      status: 'completed'
    })

    if (formData.nextVisitDate) {
      await db.insert(appointments).values({
        pregnancyId: pregnancyId,
        hospitalId: hospitalId,
        midwifeId: dbUser.id,
        scheduledDate: new Date(formData.nextVisitDate),
        status: 'scheduled'
      })
    }

    revalidatePath('/dashboard/hospital')
    revalidatePath('/dashboard/midwife')
    revalidatePath('/dashboard/pregnant-woman')
    return { success: true }
  } catch (error: any) {
    console.error('Record visit error:', error)
    return { success: false, error: 'Failed to record visit details' }
  }
}

/**
 * Generate a join code for a father to link to a pregnancy
 */
export async function generateFatherJoinCode(pregnancyId: string) {
  const user = await currentUser()
  if (!user) throw new Error('Unauthorized')

  // Verify ownership or staff role
  // (Simplified for demo)

  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  try {
    await db.update(pregnancies)
      .set({
        fatherJoinCode: joinCode,
        fatherJoinCodeExpires: expiresAt
      })
      .where(eq(pregnancies.id, pregnancyId))

    revalidatePath('/dashboard/pregnant-woman')
    return { success: true, code: joinCode }
  } catch (error) {
    console.error('Error generating join code:', error)
    return { success: false, error: 'Failed to generate code' }
  }
}

/**
 * Link a father to a pregnancy using a join code
 */
export async function linkFatherViaToken(joinCode: string) {
  const user = await currentUser()
  if (!user) throw new Error('Unauthorized')

  // Get DB user
  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id)
  })

  if (!dbUser || dbUser.role !== 'father') {
    return { success: false, error: 'Only fathers can join pregnancies' }
  }

  try {
    // Find valid pregnancy
    const pregnancy = await db.query.pregnancies.findFirst({
      where: and(
        eq(pregnancies.fatherJoinCode, joinCode.toUpperCase()),
        sql`${pregnancies.fatherJoinCodeExpires} > NOW()`
      )
    })

    if (!pregnancy) {
      return { success: false, error: 'Invalid or expired code' }
    }

    // Create partner access
    await db.insert(partnerAccess).values({
      pregnantWomanId: pregnancy.userId,
      partnerId: dbUser.id,
      pregnancyId: pregnancy.id,
      canViewAppointments: true,
      canViewLabResults: true,
      canViewProgress: true,
      canReceiveNotifications: true
    })

    // Clear code (one-time use)
    await db.update(pregnancies)
      .set({
        fatherJoinCode: null,
        fatherJoinCodeExpires: null
      })
      .where(eq(pregnancies.id, pregnancy.id))

    revalidatePath('/dashboard/father')
    return { success: true }
  } catch (error) {
    console.error('Error linking father:', error)
    return { success: false, error: 'Internal server error' }
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

    // Trigger Pusher event
    await pusherServer.trigger(`chat-${receiverId}`, 'new-message', newMessage)
    await pusherServer.trigger(`chat-${dbUser.id}`, 'new-message', newMessage)

    return { success: true, message: newMessage }
  } catch (error) {
    console.error('Error sending message:', error)
    return { success: false, error: 'Failed to send message' }
  }
}

/**
 * Get messages between two users
 */
export async function getMessages(otherUserId: string) {
  const user = await currentUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id)
  })

  if (!dbUser) throw new Error('User not found')

  try {
    const allMessages = await db.query.messages.findMany({
      where: or(
        and(eq(messages.senderId, dbUser.id), eq(messages.receiverId, otherUserId)),
        and(eq(messages.senderId, otherUserId), eq(messages.receiverId, dbUser.id))
      ),
      orderBy: [desc(messages.createdAt)],
      limit: 50
    })

    return allMessages.reverse()
  } catch (error) {
    console.error('Error fetching messages:', error)
    return []
  }
}

/**
 * MCH Book Actions
 */

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
    await db.insert(previousPregnancies).values({
      userId: data.userId,
      year: parseInt(data.year),
      pregnancyDuration: parseInt(data.duration),
      modeOfDelivery: data.mode,
      birthWeight: data.weight,
      sex: data.sex,
      alive: data.alive === 'true',
      complications: data.complications
    })

    // Trigger Real-time update
    await pusherServer.trigger(`pregnancy-${data.pregnancyId}`, 'mch-update', {
      type: 'previous_pregnancy',
      message: 'New obstetric history added'
    })

    revalidatePath(`/dashboard/hospital/patients/${data.pregnancyId}/mch-book`)
    return { success: true }
  } catch (error) {
    console.error('Save previous pregnancy error:', error)
    return { success: false, error: 'Failed to save record' }
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
