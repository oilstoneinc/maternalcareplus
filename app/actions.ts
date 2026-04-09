'use server'

import { db } from '@/lib/db'
import { users, pregnancies, appointments, labTests, partnerAccess, messages, User, NewUser, NewPregnancy, NewMessage, hospitals } from '@/lib/db/schema'
import { currentUser, clerkClient } from '@clerk/nextjs/server'
import { HospitalDashboardData, DashboardData, Message } from '@/types'
import { eq, desc, and, or, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { pusherServer } from '@/lib/pusher-server'

/**
 * Get data for the Patient (Pregnant Woman) Dashboard
 */
export async function getPatientDashboardData(): Promise<DashboardData | null> {
  const user = await currentUser()
  if (!user) throw new Error('Unauthorized')

  // Get user from our database
  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id),
  })

  if (!dbUser) return null

  // Get active pregnancy
  const pregnancy = await db.query.pregnancies.findFirst({
    where: and(
      eq(pregnancies.userId, dbUser.id),
      eq(pregnancies.status, 'active')
    ),
    with: {
      hospital: true,
    }
  })

  if (!pregnancy) return { user: dbUser, pregnancy: null, appointments: [], labs: [] }

  // Get upcoming appointments
  const upcomingAppointments = await db.query.appointments.findMany({
    where: and(
      eq(appointments.pregnancyId, pregnancy.id),
      sql`${appointments.scheduledDate} >= NOW()`
    ),
    orderBy: [desc(appointments.scheduledDate)],
    limit: 5,
  })

  // Get recent lab results
  const recentLabs = await db.query.labTests.findMany({
    where: eq(labTests.pregnancyId, pregnancy.id),
    orderBy: [desc(labTests.resultDate)],
    limit: 3,
  })

  return {
    user: dbUser,
    pregnancy,
    appointments: upcomingAppointments,
    labs: recentLabs,
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
      throw new Error(`getHospitalDashboardData: No dbUser found in Neon DB for exact Clerk ID ${user.id}`)
    }
    
    if (dbUser.role !== 'hospital_staff' && dbUser.role !== 'admin') {
      throw new Error(`getHospitalDashboardData: Unauthorized role access attempt. Expected hospital_staff or admin, but got: ${dbUser.role}`)
    }

    // Get all patients
    const allPatients = await db.query.users.findMany({
      where: eq(users.role, 'pregnant_woman'),
      limit: 50,
    })

    // Get active pregnancies
    const activePregnancies = await db.query.pregnancies.findMany({
      where: eq(pregnancies.status, 'active'),
      limit: 50,
    })

    // Get today's appointments
    const todayAppointments = await db.query.appointments.findMany({
      where: sql`DATE(${appointments.scheduledDate}) = CURRENT_DATE`,
      limit: 20,
    })

    return {
      patients: allPatients,
      pregnancies: activePregnancies,
      appointments: todayAppointments,
    }
  } catch (error) {
    console.error('Error in getHospitalDashboardData:', error)
    throw new Error(`getHospitalDashboardData failed: ${error instanceof Error ? error.message : String(error)}`)
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
    with: {
      pregnancy: true
    }
  })

  const pregnancy = access?.pregnancy as any || null

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

    // Check if user exists in DB
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, user.id)
    })

    const role = (user.publicMetadata?.role as string) || 'hospital_staff'

    if (!dbUser) {
      // FORCE CREATE: Handle cases where webhook hasn't run yet
      console.log(`Self-healing: Creating missing user record for ${user.id}`)
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
       // FORCE UPDATE: User exists but their role in DB is different from Clerk (e.g. they were just promoted)
       console.log(`Self-healing: Synchronizing role for ${user.id} -> ${role}`)
       await db.update(users)
         .set({ role: role as any, updatedAt: new Date() })
         .where(eq(users.clerkId, user.id))
    }

    // If it's a hospital staff role, ensure they have a hospital entry
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

    // Proactive Metadata Sync: Push role to Clerk if missing
    if (!user.publicMetadata?.role) {
      await (await clerkClient()).users.updateUserMetadata(user.id, {
        publicMetadata: { role: role }
      })
    }

    // Determine target path for instant redirection injection
    let targetPath = '/dashboard'
    if (role === 'admin') targetPath = '/dashboard/admin'
    if (role === 'hospital_staff') targetPath = '/dashboard/hospital'

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
    const newClerkUser = await client.users.createUser({
      firstName: formData.firstName,
      lastName: formData.lastName,
      emailAddress: [formData.email], // Note: array mapping
      password: formData.password || 'MaternalCare123!', // Temporary password
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
      // Find hospital logic
      let hospitalId = '00000000-0000-0000-0000-000000000000';
      const hospitalData = await db.query.hospitals.findFirst();
      if (hospitalData) { hospitalId = hospitalData.id }

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
    return { success: true }
  } catch (error: any) {
    console.error('Onboarding error:', error)
    return { success: false, error: error?.errors?.[0]?.message || 'Failed to onboard patient' }
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
