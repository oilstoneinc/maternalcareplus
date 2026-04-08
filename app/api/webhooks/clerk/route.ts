import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users, hospitals } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: Request) {
  // Found in the Clerk Dashboard -> Webhooks -> Webhook setup page
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET
 
  if (!WEBHOOK_SECRET) {
    throw new Error('Please add WEBHOOK_SECRET from Clerk Dashboard to your .env file')
  }
 
  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");
 
  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers found', {
      status: 400
    })
  }
 
  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload);
 
  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);
 
  let evt: WebhookEvent
 
  // Verify the payload using the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error validating webhook payload', {
      status: 400
    })
  }

  // Handle the webhook logic
  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, unsafe_metadata, public_metadata } = evt.data;
    
    const primaryEmail = email_addresses[0]?.email_address || 'unknown@email.com';
    
    // Clerk might put it in unsafe or public metadata depending on how we set it.
    const metadataRole = (unsafe_metadata?.role || public_metadata?.role) as string;
    const role = (metadataRole as 'pregnant_woman' | 'father' | 'midwife' | 'hospital_staff' | 'admin') || 'hospital_staff';
    const phone = (unsafe_metadata?.phone as string) || null;

    try {
      // 1. Insert user into Database users table
      await db.insert(users).values({
        clerkId: id,
        email: primaryEmail,
        firstName: first_name || 'Hospital',
        lastName: last_name || 'Staff',
        phone: phone,
        role: role,
        isVerified: true,
      })

      // 2. Provision hospital record if this is a hospital sign up
      if (role === 'hospital_staff') {
         await db.insert(hospitals).values({
            name: `${first_name || 'New'} Hospital/Clinic`,
            code: `HSP-${Math.floor(Math.random() * 100000)}`,
            address: 'Update Address from Dashboard',
            region: 'Greater Accra', // default example
            city: 'Accra',
            phone: phone || '0000000000',
            email: primaryEmail,
            type: 'Hospital'
         })
      }

      console.log(`User ${id} successfully synchronized to DB with role ${role}`);
    } catch (dbError) {
      console.error('Error saving new Clerk user to DB:', dbError);
      return new Response('Database synchronization failed', { status: 500 });
    }
  }

  if (eventType === 'user.updated') {
     // Handle user logic updates if needed
     console.log('Update event received for', evt.data.id)
  }

  return new Response('Webhook received gracefully', { status: 200 })
}
