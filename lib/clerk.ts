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
 * Gets the user's role.
 * ALWAYS checks the database as a fallback if JWT is stale.
 * This is the key fix for the redirect loop — the JWT does not
 * update immediately after syncClerkAccount(), so we must
 * check the database directly on every role check.
 */
export async function getUserRole(live = false) {
  const user = await getCurrentUser()
  if (!user) return null
  
  // 1. Try the JWT/session claims first (fastest, works most of the time)
  let role = (user.publicMetadata?.role as string) || null

  // 2. ALWAYS fall back to DB if JWT is stale (e.g. right after first activation)
  if (!role) {
    try {
      const dbUser = await db.query.users.findFirst({
        where: eq(users.clerkId, user.id)
      })
      if (dbUser?.role) {
        role = dbUser.role as string
        console.log(`[getUserRole] Fallback SUCCESS: Found role ${role} in Neon DB for ${user.id}`)
        // Proactively sync role back to Clerk so future JWT checks work
        try {
          await clerk.users.updateUserMetadata(user.id, {
            publicMetadata: { role: dbUser.role }
          })
        } catch (syncErr) {
          console.error(`[getUserRole] Warning: Failed to sync role up to Clerk:`, syncErr)
        }
      } else {
         console.warn(`[getUserRole] Fallback warning: dbUser found but role is undefined/null`)
      }
    } catch (dbErr) {
      console.error(`[getUserRole] CRITICAL DB ERROR during fallback check:`, dbErr)
    }
  }

  // 3. If live=true, do an extra fresh Clerk API check as well
  if (live && !role) {
    try {
      const liveUser = await clerk.users.getUser(user.id)
      role = (liveUser.publicMetadata?.role as string) || null
    } catch (liveErr) {
      console.error(`[getUserRole] Live check error:`, liveErr)
    }
  }
  
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
    console.error(`[requireRole] FORBIDDEN! User ${user.id} has role '${userRole}' but needed one of [${allowedRoles.join(', ')}]`)
    redirect('/unauthorized')
  }
  
  return user
}
