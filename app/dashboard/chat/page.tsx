import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import ChatHub from '@/components/dashboard/ChatHub'
import { redirect } from 'next/navigation'

export default async function ChatPage({
  searchParams,
}: {
  searchParams: { with: string }
}) {
  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id),
  })

  if (!dbUser) redirect('/onboarding')

  const otherUserId = searchParams.with
  if (!otherUserId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Please select a conversation to start chatting.</p>
      </div>
    )
  }

  const otherUser = await db.query.users.findFirst({
    where: eq(users.id, otherUserId),
  })

  if (!otherUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">User not found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground">Real-time communication with your care team.</p>
      </div>
      <ChatHub 
        currentUserId={dbUser.id}
        otherUserId={otherUser.id}
        otherUserName={otherUser.name || 'User'}
      />
    </div>
  )
}
