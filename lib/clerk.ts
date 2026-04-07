import { currentUser } from '@clerk/nextjs/server'

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
    throw new Error('Authentication required')
  }
  return user
}

export async function requireRole(role: string | string[]) {
  const user = await requireAuth()
  const userRole = await getUserRole()
  
  const allowedRoles = Array.isArray(role) ? role : [role]
  
  if (!userRole || allowedRoles.indexOf(userRole) === -1) {
    throw new Error(`Access denied. Required role: ${allowedRoles.join(' or ')}`)
  }
  
  return user
}
