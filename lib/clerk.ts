import { currentUser, createClerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

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
  
  if (live) {
    const liveUser = await clerk.users.getUser(user.id)
    return liveUser.publicMetadata?.role as string || null
  }
  
  // Get user role from public metadata
  return user.publicMetadata?.role as string || null
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
