import { currentUser, createClerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from './db'
import { users } from './db/schema'
import { eq } from 'drizzle-orm'

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

export async function getCurrentUser() {
  return await currentUser()
}

/**
 * Gets the user's role, with an optional "live" check that bypasses
 * cached session claims by calling the Clerk API directly.
 */
export async function getUserRole(live = false) {
  const user = await getCurrentUser()
  if (!user) return null
  
  let role = (user.publicMetadata?.role as string) || null

  if (live) {
    const liveUser = await clerk.users.getUser(user.id)
    role = (liveUser.publicMetadata?.role as string) || null

    if (!role) {
      // Fallback to database
      const dbUser = await db.query.users.findFirst({
        where: eq(users.clerkId, user.id)
      })
      if (dbUser?.role) {
        role = dbUser.role
        // Sync back to Clerk on-the-fly
        await clerk.users.updateUserMetadata(user.id, {
          publicMetadata: { role: dbUser.role }
        })
      }
    }
  }
  
  // Get user role from public metadata
  return role
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/sign-in')
  }
  return user
}

export async function requireRole(role: string | string[]) {
  const user = await requireAuth()
  const userRole = await getUserRole()
  
  const allowedRoles = Array.isArray(role) ? role : [role]
  
  if (!userRole || allowedRoles.indexOf(userRole) === -1) {
    redirect('/unauthorized')
  }
  
  return user
}
