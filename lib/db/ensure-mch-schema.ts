import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

let mchSchemaEnsured = false

/** Ensures MCH-related tables/columns exist (production DB may predate schema additions). */
export async function ensureMCHSchema() {
  if (mchSchemaEnsured) return

  const statements = [
    sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ghana_card_id" text UNIQUE`,
    sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_shift_code_verified" text`,
    sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_shift_code_verified_at" timestamp`,
    sql`ALTER TABLE "hospitals" ADD COLUMN IF NOT EXISTS "shift_code" text`,
    sql`ALTER TABLE "hospitals" ADD COLUMN IF NOT EXISTS "shift_code_expires_at" timestamp`,
    sql`
      CREATE TABLE IF NOT EXISTS "staff_login_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "hospital_id" uuid NOT NULL,
        "login_time" timestamp DEFAULT now() NOT NULL,
        "logout_time" timestamp,
        "session_duration" integer,
        "ip_address" text,
        "user_agent" text,
        "status" text DEFAULT 'active' NOT NULL
      )
    `,
    sql`ALTER TABLE "pregnancies" ADD COLUMN IF NOT EXISTS "mch_data" json`,
    sql`ALTER TABLE "pregnancies" ADD COLUMN IF NOT EXISTS "midwife_id" uuid`,
    sql`ALTER TABLE "pregnancies" ADD COLUMN IF NOT EXISTS "iptp_doses" integer DEFAULT 0`,
    sql`ALTER TABLE "pregnancies" ADD COLUMN IF NOT EXISTS "tt_doses" integer DEFAULT 0`,
    sql`ALTER TABLE "pregnancies" ADD COLUMN IF NOT EXISTS "itn_distributed" boolean DEFAULT false`,
    sql`ALTER TABLE "hospitals" ADD COLUMN IF NOT EXISTS "latitude" numeric(9, 6)`,
    sql`ALTER TABLE "hospitals" ADD COLUMN IF NOT EXISTS "longitude" numeric(9, 6)`,
    sql`
      CREATE TABLE IF NOT EXISTS "previous_pregnancies" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "year" integer NOT NULL,
        "pregnancy_duration" integer,
        "mode_of_delivery" text,
        "birth_weight" numeric(5, 2),
        "sex" text,
        "alive" boolean DEFAULT true,
        "complications" text,
        "created_at" timestamp DEFAULT now()
      )
    `,
    sql`
      CREATE TABLE IF NOT EXISTS "deliveries" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "pregnancy_id" uuid NOT NULL,
        "hospital_id" uuid NOT NULL,
        "delivery_date" timestamp NOT NULL,
        "mode_of_delivery" text NOT NULL,
        "apgar_score_1min" integer,
        "apgar_score_5min" integer,
        "blood_loss" integer,
        "maternal_complications" text,
        "neonatal_complications" text,
        "delivered_by" uuid,
        "notes" text,
        "created_at" timestamp DEFAULT now()
      )
    `,
    sql`
      CREATE TABLE IF NOT EXISTS "postnatal_care" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "pregnancy_id" uuid NOT NULL,
        "visit_period" text NOT NULL,
        "visit_date" timestamp NOT NULL,
        "maternal_condition" text,
        "lochia" text,
        "perineum" text,
        "breastfeeding_status" text,
        "baby_condition" text,
        "umbilical_cord" text,
        "family_planning_method" text,
        "notes" text,
        "created_at" timestamp DEFAULT now()
      )
    `,
    sql`
      CREATE TABLE IF NOT EXISTS "children" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "pregnancy_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "first_name" text,
        "last_name" text,
        "date_of_birth" timestamp NOT NULL,
        "sex" text NOT NULL,
        "birth_weight" numeric(5, 2),
        "birth_length" numeric(5, 2),
        "created_at" timestamp DEFAULT now()
      )
    `,
    sql`
      CREATE TABLE IF NOT EXISTS "immunizations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "child_id" uuid NOT NULL,
        "vaccine_name" text NOT NULL,
        "dose_number" integer DEFAULT 1,
        "target_age" text,
        "date_administered" timestamp,
        "batch_number" text,
        "administered_by" uuid,
        "created_at" timestamp DEFAULT now()
      )
    `,
    sql`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "pregnancy_id" uuid,
        "title" text NOT NULL,
        "message" text NOT NULL,
        "type" text NOT NULL,
        "scheduled_for" timestamp,
        "sent_at" timestamp,
        "is_read" boolean DEFAULT false,
        "created_at" timestamp DEFAULT now()
      )
    `,
    sql`
      CREATE TABLE IF NOT EXISTS "child_growth" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "child_id" uuid NOT NULL,
        "record_date" timestamp NOT NULL,
        "age_in_months" integer NOT NULL,
        "weight" numeric(5, 2),
        "height" numeric(5, 2),
        "head_circumference" numeric(5, 2),
        "notes" text,
        "created_at" timestamp DEFAULT now()
      )
    `,
    sql`
      CREATE TABLE IF NOT EXISTS "hospital_care_encounters" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "pregnancy_id" uuid NOT NULL,
        "patient_user_id" uuid NOT NULL,
        "hospital_id" uuid NOT NULL,
        "home_hospital_id" uuid NOT NULL,
        "is_visiting_facility" boolean DEFAULT false NOT NULL,
        "staff_user_id" uuid,
        "action" text NOT NULL,
        "summary" text NOT NULL,
        "metadata" json,
        "created_at" timestamp DEFAULT now()
      )
    `,
    sql`ALTER TABLE "lab_tests" ADD COLUMN IF NOT EXISTS "attachment_url" text`,
    sql`ALTER TABLE "lab_tests" ADD COLUMN IF NOT EXISTS "attachment_name" text`,
  ]

  for (const statement of statements) {
    try {
      await db.execute(statement)
    } catch (err) {
      console.warn('[ensureMCHSchema] statement skipped:', err)
    }
  }

  mchSchemaEnsured = true
}
