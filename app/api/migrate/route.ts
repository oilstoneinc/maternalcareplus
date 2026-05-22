import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await db.execute(sql`ALTER TABLE "pregnancies" ADD COLUMN IF NOT EXISTS "mch_data" json;`);
    await db.execute(sql`ALTER TABLE "pregnancies" ADD COLUMN IF NOT EXISTS "midwife_id" uuid REFERENCES "users"("id");`);
    await db.execute(sql`ALTER TABLE "hospital_invites" ADD CONSTRAINT "hospital_invites_email_unique" UNIQUE ("email");`).catch(() => {});
    return NextResponse.json({ success: true, message: "Migration applied safely" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
