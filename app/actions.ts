'use server'

import { db } from '@/lib/db'
import { users, pregnancies, appointments, labTests, partnerAccess, messages, User, NewUser, NewPregnancy, NewMessage, hospitals, vitalSigns, previousPregnancies, deliveries, postnatalCare, children, immunizations, childGrowth, hospitalInvites, partnershipRequests, notifications } from '@/lib/db/schema'
import { currentUser, clerkClient } from '@clerk/nextjs/server'
import { HospitalDashboardData, DashboardData, Message } from '@/types'
import { eq, desc, asc, and, or, sql, ilike, inArray } from 'drizzle-orm'
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
  revalidatePath('/dashboard/father')
  revalidatePath('/dashboard/hospital')
  revalidatePath('/dashboard/midwife')
  revalidatePath(`/dashboard/hospital/patients/${pregnancyId}`)
  revalidatePath(`/dashboard/hospital/patients/${pregnancyId}/mch-book`)
}

async function requireClinicalStaff() {
  const user = await currentUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id),
  })

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

    return {
      user: dbUser,
      pregnancy: {
        ...pregnancyWithHospital,
        gestationalAge:
          pregnancy.gestationalAge ?? calcGestationalAgeWeeks(pregnancy.lmp),
      },
      appointments: upcomingAppointments,
      labs: recentLabs,
      vitals: recentVitals,
      careContact,
      notifications: patientNotifications,
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

    // SAFE GUARD: If hospital staff has no hospitalId yet, return a minimal
    // pending state that signals to the server page to redirect to /onboarding/hospital
    // instead of crashing the Drizzle query with eq(column, null).
    if (!dbUser.hospitalId) {
      console.warn(`getHospitalDashboardData: User ${user.id} has hospital_staff role but no hospitalId. Returning pending setup state.`)
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

    return JSON.parse(JSON.stringify({
      hospital,
      patients: allPatients,
      pregnancies: activePregnancies,
      careStaff,
      appointments: todayAppointments,
      upcomingAppointments: enrichedAppointments,
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

  return JSON.parse(JSON.stringify({
    midwife: dbUser,
    patients,
  }))
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
      await db.update(users)
        .set({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone || existingUser.phone,
          address: formData.address || existingUser.address,
          hospitalId: dbUser.hospitalId || existingUser.hospitalId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id))
      console.log(`[onboardPatient] Reusing and updating existing user record ${existingUser.id} for email ${emailLower}`)
    } else {
      // 1. Generate invitation token and temporary placeholders
      const inviteToken = `INV-PW-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      
      // 2. Register patient directly in our DB immediately (so hospital sees it instantly!)
      const [inserted] = await db.insert(users).values({
        clerkId: inviteToken, // placeholder invitation token
        email: emailLower,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone || null,
        role: formData.role || 'pregnant_woman',
        address: formData.address || null,
        hospitalId: dbUser.hospitalId,
        isVerified: false,
      }).returning()
      newUser = inserted
      console.log(`[onboardPatient] Created new patient record ${newUser.id} in DB`)
    }

    // 3. Create or update Pregnancy record if applicable
    if ((formData.role || 'pregnant_woman') === 'pregnant_woman' && formData.lmp) {
      let hospitalId = dbUser.hospitalId;
      if (!hospitalId) {
        throw new Error('You must be assigned to a hospital to onboard a patient.')
      }

      // Check if pregnancy record already exists for this patient
      const existingPregnancy = await db.query.pregnancies.findFirst({
        where: eq(pregnancies.userId, newUser.id)
      })

      if (!existingPregnancy) {
        await db.insert(pregnancies).values({
          userId: newUser.id,
          hospitalId: formData.hospitalId || hospitalId,
          gravidity: parseInt(formData.gravidity) || 1,
          parity: parseInt(formData.parity) || 0,
          lmp: new Date(formData.lmp),
          edd: new Date(new Date(formData.lmp).setDate(new Date(formData.lmp).getDate() + 280)), // Rule of thumb
          status: 'active',
        })
        console.log(`[onboardPatient] Instantiated new pregnancy record for user ${newUser.id}`)
      } else {
        // Update existing pregnancy record
        await db.update(pregnancies)
          .set({
            hospitalId: formData.hospitalId || hospitalId,
            gravidity: parseInt(formData.gravidity) || existingPregnancy.gravidity,
            parity: parseInt(formData.parity) || existingPregnancy.parity,
            lmp: new Date(formData.lmp),
            edd: new Date(new Date(formData.lmp).setDate(new Date(formData.lmp).getDate() + 280)),
          })
          .where(eq(pregnancies.id, existingPregnancy.id))
        console.log(`[onboardPatient] Updated existing pregnancy record ${existingPregnancy.id} for user ${newUser.id}`)
      }
    }

    // 4. Send programmatic Clerk Invitation to trigger automatic email delivery
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
      console.log(`[onboardPatient] Programmatic Clerk Invitation successfully sent/resent to pregnant woman ${emailLower}`)
    } catch (clerkErr: any) {
      console.error('[onboardPatient] Warning: Clerk programmatic invitation failed:', clerkErr)
      // We still proceed so the DB record is persisted
    }

    revalidatePath('/dashboard/hospital')
    return { 
      success: true, 
      data: {
        email: emailLower, 
        isInvitationFlow: true,
        loginUrl: `${origin}/sign-up`
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

    const pregnancyId = formData.pregnancyId
    const bpSys = parseIntOrNull(formData.bpSystolic)
    const bpDia = parseIntOrNull(formData.bpDiastolic)

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
    revalidatePregnancyPaths(pregnancyId)
    return { success: true }
  } catch (error: unknown) {
    console.error('recordVitals error:', error)
    return { success: false, error: 'Failed to save vitals' }
  }
}

/** Full ANC visit: vitals + clinical findings + optional follow-up appointment */
export async function recordAntenatalVisit(formData: any) {
  try {
    const { dbUser } = await requireClinicalStaff()
    await ensureMCHSchema()

    const pregnancyId = formData.pregnancyId as string
    const hospitalId = formData.hospitalId as string
    const gestationalAge = parseIntOrNull(formData.gestationalAge)
    const bpSys = parseIntOrNull(formData.bpSystolic)
    const bpDia = parseIntOrNull(formData.bpDiastolic)
    const fhr = parseIntOrNull(formData.fhr)
    const heartRate = parseIntOrNull(formData.heartRate)

    const pregnancyUpdate: Partial<typeof pregnancies.$inferInsert> = {}
    if (formData.medicalHistory) pregnancyUpdate.medicalHistory = formData.medicalHistory
    if (formData.allergies) {
      pregnancyUpdate.allergies = String(formData.allergies)
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
    }
    if (formData.medications) {
      pregnancyUpdate.medications = String(formData.medications)
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
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

    await notifyPregnancyUpdate(
      pregnancyId,
      'A new Antenatal Clinic (ANC) checkup was recorded by your hospital.'
    )
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
}) {
  try {
    const { dbUser } = await requireClinicalStaff()
    await ensureMCHSchema()

    const pregnancyId = formData.pregnancyId
    const isScan = formData.testType === 'scan'
    const testName = formData.testName?.trim()
    if (!testName) return { success: false, error: 'Test or scan name is required' }

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
    })

    await notifyPregnancyUpdate(
      pregnancyId,
      isScan
        ? 'A new ultrasound/imaging scan was added to your record.'
        : 'New lab results were added to your record.',
      'labs-update'
    )
    revalidatePregnancyPaths(pregnancyId)
    return { success: true }
  } catch (error: unknown) {
    console.error('recordLabOrScan error:', error)
    return { success: false, error: 'Failed to save lab or scan record' }
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

  if (!queryText || queryText.trim().length < 2) {
    return []
  }

  const cleanQuery = `%${queryText.trim()}%`

  try {
    // Query patients match
    const matchingPatients = await db.query.users.findMany({
      where: and(
        eq(users.role, 'pregnant_woman'),
        or(
          ilike(users.firstName, cleanQuery),
          ilike(users.lastName, cleanQuery),
          ilike(users.email, cleanQuery),
          ilike(users.phone, cleanQuery)
        )
      ),
      limit: 25
    })

    const results = []

    for (const patient of matchingPatients) {
      // Find active pregnancy
      const activePreg = await db.query.pregnancies.findFirst({
        where: and(
          eq(pregnancies.userId, patient.id),
          eq(pregnancies.status, 'active')
        )
      })

      if (activePreg) {
        // Find onboarding hospital
        const onboardingHospital = await db.query.hospitals.findFirst({
          where: eq(hospitals.id, activePreg.hospitalId)
        })

        results.push({
          id: patient.id,
          name: `${patient.firstName} ${patient.lastName}`.trim(),
          email: patient.email,
          phone: patient.phone,
          pregnancyId: activePreg.id,
          onboardedHospitalName: onboardingHospital ? onboardingHospital.name : 'Unknown Hospital',
          onboardedHospitalLocation: onboardingHospital ? `${onboardingHospital.city}, ${onboardingHospital.region}` : 'Unknown Location'
        })
      }
    }

    return results
  } catch (error) {
    console.error('searchGlobalPatients error:', error)
    return []
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

    if (dbUser.role !== 'admin' && pregnancy.hospitalId !== dbUser.hospitalId) {
      return { success: false, error: 'Not authorized for this patient' }
    }

    const visitDate = new Date(scheduledDate)
    if (Number.isNaN(visitDate.getTime())) {
      return { success: false, error: 'Invalid date' }
    }

    const [created] = await db.insert(appointments).values({
      pregnancyId,
      hospitalId: pregnancy.hospitalId,
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

