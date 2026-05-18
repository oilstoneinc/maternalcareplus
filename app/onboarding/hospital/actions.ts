'use server'

import { db } from '@/lib/db'
import { hospitals, users, hospitalInvites } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@clerk/nextjs/server'
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

  // Get user to find hospitalId
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  })

  if (!user || !user.hospitalId) {
    throw new Error('User or Hospital not found')
  }

  // Update hospital details and verify
  await db.update(hospitals)
    .set({
      name,
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
      .where(eq(hospitalInvites.email, user.email))
  }

  // Redirect to dashboard after completion
  redirect('/dashboard/hospital')
}
