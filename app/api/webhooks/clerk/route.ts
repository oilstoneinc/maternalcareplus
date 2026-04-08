import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users, hospitals } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET
 
  if (!WEBHOOK_SECRET) {
    console.error('Missing WEBHOOK_SECRET in environment variables')
    return new Response('Error: Missing webhook secret', { status: 500 })
  }
 
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");
 
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing svix headers', { status: 400 })
  }
 
  const payload = await req.json()
  const body = JSON.stringify(payload);
  const wh = new Webhook(WEBHOOK_SECRET);
 
  let evt: WebhookEvent
 
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error validating webhook payload', { status: 400 })
  }

  const eventType = evt.type;

  // HANDLE USER CREATION & UPDATES (Unified via Upsert)
  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, unsafe_metadata, public_metadata, image_url } = evt.data;
    const primaryEmail = email_addresses[0]?.email_address || 'unknown@email.com';
    const metadataRole = (unsafe_metadata?.role || public_metadata?.role) as string;
    const role = (metadataRole as any) || 'hospital_staff';
    const phone = (unsafe_metadata?.phone as string) || null;

    try {
      // UPSERT USER: This handles both creation and updates seamlessly
      await db.insert(users).values({
        clerkId: id,
        email: primaryEmail,
        firstName: first_name || 'User',
        lastName: last_name || '',
        phone: phone,
        role: role,
        isVerified: true,
        isActive: true,
      }).onConflictDoUpdate({
        target: users.clerkId,
        set: {
          email: primaryEmail,
          firstName: first_name || 'User',
          lastName: last_name || '',
          phone: phone,
          role: role,
          updatedAt: new Date(),
        }
      })

      // If it's a hospital staff, ensure a hospital record exists
      if (role === 'hospital_staff') {
        const existingHospital = await db.query.hospitals.findFirst({
          where: eq(hospitals.email, primaryEmail)
        })

        let hospitalId = existingHospital?.id;

        if (!existingHospital) {
          const [newHospital] = await db.insert(hospitals).values({
            name: first_name && first_name !== 'User' ? `${first_name}'s Medical Center` : `Pending Institutional Setup (${primaryEmail})`,
            code: `HSP-${Math.floor(Math.random() * 100000)}`,
            address: 'Default Address',
            region: 'Greater Accra',
            city: 'Accra',
            phone: phone || '0000000000',
            email: primaryEmail,
            type: 'Hospital'
          }).returning()
          hospitalId = newHospital.id;
        }

        // Link the user to the hospital
        if (hospitalId) {
          await db.update(users)
            .set({ hospitalId })
            .where(eq(users.clerkId, id))
        }
      }

      console.log(`User ${id} (${eventType}) synchronized successfully.`);
    } catch (err) {
      console.error('Database sync error:', err);
      return new Response('Database sync failed', { status: 500 })
    }
  }

  // HANDLE USER DELETION
  if (eventType === 'user.deleted') {
    const { id } = evt.data;
    try {
      // We deactivate instead of delete to preserve historic medical records
      await db.update(users)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(users.clerkId, id!))
      
      console.log(`User ${id} deactivated in database.`);
    } catch (err) {
      console.error('Deletion sync error:', err);
      return new Response('Deletion sync failed', { status: 500 })
    }
  }

  return new Response('Success', { status: 200 })
}
