'use server'

import { db } from '@/lib/db'
import { hospitals, users, hospitalInvites } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export async function completeHospitalProfile(formData: FormData) {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error('Not authenticated')
  }

  const name = formData.get('name') as string
  const region = formData.get('region') as string
  const city = formData.get('city') as string
  const phone = formData.get('phone') as string
  const type = formData.get('type') as string

  // Get user from Drizzle database
  let user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  })

  // SELF-HEALING 1: If user isn't synchronized in Neon DB yet, build it on the fly!
  if (!user) {
    const clerk = await clerkClient()
    const clerkUser = await clerk.users.getUser(userId)
    const primaryEmail = clerkUser.emailAddresses[0]?.emailAddress || ''
    
    const [newUser] = await db.insert(users).values({
      clerkId: userId,
      email: primaryEmail.toLowerCase(),
      firstName: clerkUser.firstName || 'User',
      lastName: clerkUser.lastName || '',
      role: 'hospital_staff',
      isVerified: true,
      isActive: true,
    }).returning()
    user = newUser
    console.log(`[completeHospitalProfile] Self-healing user creation successful for ${userId}`)
  }

  // SELF-HEALING 2: If user doesn't have a Drizzle hospitalId yet, find or create it!
  if (!user.hospitalId) {
    const primaryEmail = user.email || ''
    
    const existingHospital = await db.query.hospitals.findFirst({
      where: eq(hospitals.email, primaryEmail.toLowerCase())
    })
    
    if (existingHospital) {
      await db.update(users)
        .set({ hospitalId: existingHospital.id })
        .where(eq(users.id, user.id))
      user.hospitalId = existingHospital.id
      console.log(`[completeHospitalProfile] Linked existing hospital ${existingHospital.name} to user ${user.id}`)
    } else {
      const hospitalCode = `HSP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      const [newHospital] = await db.insert(hospitals).values({
        name: name.trim(),
        code: hospitalCode,
        address: 'Pending Setup',
        region: region,
        city: city,
        phone: phone,
        email: primaryEmail.toLowerCase(),
        type: type,
        isVerified: true,
      }).returning()
      
      await db.update(users)
        .set({ hospitalId: newHospital.id })
        .where(eq(users.id, user.id))
      user.hospitalId = newHospital.id
      console.log(`[completeHospitalProfile] Instantiated dynamic hospital setup for user ${user.id}`)
    }
  }

  // Update hospital details and verify
  await db.update(hospitals)
    .set({
      name: name.trim(),
      region,
      city,
      phone,
      type,
      isVerified: true, // Mark verified when profiling is completed
      updatedAt: new Date(),
    })
    .where(eq(hospitals.id, user.hospitalId))

  // Sync invite status in DB
  if (user.email) {
    await db.update(hospitalInvites)
      .set({
        status: 'accepted',
        acceptedAt: new Date()
      })
      .where(eq(hospitalInvites.email, user.email.toLowerCase()))
  }

  // Redirect to dashboard after completion
  redirect('/dashboard/hospital')
}
