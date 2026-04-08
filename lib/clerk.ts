import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export async function getCurrentUser() {
  return await currentUser()
}

export async function getUserRole() {
  const user = await getCurrentUser()
  if (!user) return null
  
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
