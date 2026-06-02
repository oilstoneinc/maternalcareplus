import { db } from '@/lib/db'
import { hospitalCareEncounters, hospitals, pregnancies, users } from '@/lib/db/schema'
import { eq, desc, inArray } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { notifyPatientForPregnancy } from '@/lib/patient-notifications'

export type CareEncounterAction =
  | 'registry_access'
  | 'anc_visit'
  | 'vitals'
  | 'lab_scan'
  | 'medical_update'
  | 'mch_advice'
  | 'appointment_scheduled'
  | 'blood_type_update'
  | 'timeline_update'
  | 'new_pregnancy_started'

const ACTION_LABELS: Record<CareEncounterAction, string> = {
  registry_access: 'Record reviewed',
  anc_visit: 'ANC visit recorded',
  vitals: 'Vitals recorded',
  lab_scan: 'Lab or scan added',
  medical_update: 'Medical info updated',
  mch_advice: 'Clinical advice posted',
  appointment_scheduled: 'Visit scheduled',
  blood_type_update: 'Blood type updated',
  timeline_update: 'Pregnancy dates updated',
  new_pregnancy_started: 'New pregnancy journey started',
}

let hospitalCareSchemaEnsured = false

export async function ensureHospitalCareSchema() {
  if (hospitalCareSchemaEnsured) return
  await db.execute(sql`
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
  `)
  hospitalCareSchemaEnsured = true
}

export async function recordFacilityCareEvent(params: {
  pregnancyId: string
  staffUserId: string
  staffHospitalId: string | null | undefined
  action: CareEncounterAction
  summary: string
  metadata?: Record<string, unknown>
  notifyIfVisiting?: boolean
}) {
  try {
    await ensureHospitalCareSchema()

    const pregnancy = await db.query.pregnancies.findFirst({
      where: eq(pregnancies.id, params.pregnancyId),
    })
    if (!pregnancy) return

    const facilityId = params.staffHospitalId || pregnancy.hospitalId
    const isVisiting = facilityId !== pregnancy.hospitalId

    await db.insert(hospitalCareEncounters).values({
      pregnancyId: params.pregnancyId,
      patientUserId: pregnancy.userId,
      hospitalId: facilityId,
      homeHospitalId: pregnancy.hospitalId,
      isVisitingFacility: isVisiting,
      staffUserId: params.staffUserId,
      action: params.action,
      summary: params.summary,
      metadata: params.metadata ?? null,
    })

    if (isVisiting && params.notifyIfVisiting !== false) {
      const facility = await db.query.hospitals.findFirst({
        where: eq(hospitals.id, facilityId),
      })
      const home = await db.query.hospitals.findFirst({
        where: eq(hospitals.id, pregnancy.hospitalId),
      })
      const facilityLabel = facility
        ? `${facility.name} (${facility.city}, ${facility.region})`
        : 'Another hospital'
      const homeLabel = home?.name || 'your home clinic'

      await notifyPatientForPregnancy(
        params.pregnancyId,
        `${facilityLabel} ${ACTION_LABELS[params.action] || 'updated your care'} during your visit: ${params.summary}. Your records stay linked nationally — ${homeLabel} can see this history too.`,
        'facility_visit',
        'mch-update'
      )
    }
  } catch (err) {
    console.warn('[recordFacilityCareEvent]', err)
  }
}

export type CareHistoryEntry = {
  id: string
  action: string
  actionLabel: string
  summary: string
  hospitalName: string
  hospitalCity: string
  hospitalRegion: string
  isVisitingFacility: boolean
  staffName: string | null
  createdAt: string
}

export async function getHospitalCareHistory(
  pregnancyId: string,
  limit = 40
): Promise<CareHistoryEntry[]> {
  await ensureHospitalCareSchema()

  const rows = await db.query.hospitalCareEncounters.findMany({
    where: eq(hospitalCareEncounters.pregnancyId, pregnancyId),
    orderBy: [desc(hospitalCareEncounters.createdAt)],
    limit,
  })

  const hospitalIds = [...new Set(rows.map((r) => r.hospitalId))]
  const staffIds = [...new Set(rows.map((r) => r.staffUserId).filter(Boolean))] as string[]

  const hospitalList =
    hospitalIds.length > 0
      ? await db.query.hospitals.findMany({
          where: inArray(hospitals.id, hospitalIds),
        })
      : []

  const staffList =
    staffIds.length > 0
      ? await db.query.users.findMany({
          where: inArray(users.id, staffIds),
        })
      : []

  const hospitalById = new Map(hospitalList.map((h) => [h.id, h]))
  const staffById = new Map(staffList.map((s) => [s.id, s]))

  return rows.map((row) => {
    const h = hospitalById.get(row.hospitalId)
    const staff = row.staffUserId ? staffById.get(row.staffUserId) : null
    return {
      id: row.id,
      action: row.action,
      actionLabel: ACTION_LABELS[row.action as CareEncounterAction] || row.action,
      summary: row.summary,
      hospitalName: h?.name || 'Unknown facility',
      hospitalCity: h?.city || '',
      hospitalRegion: h?.region || '',
      isVisitingFacility: row.isVisitingFacility ?? false,
      staffName: staff ? `${staff.firstName} ${staff.lastName}`.trim() : null,
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : '',
    }
  })
}

export async function getCareHistoryFacilitySummary(pregnancyId: string) {
  const history = await getHospitalCareHistory(pregnancyId, 100)
  const byHospital = new Map<
    string,
    { hospitalName: string; city: string; region: string; visitCount: number; lastVisit: string; isHome: boolean }
  >()

  for (const entry of history) {
    const key = entry.hospitalName
    const existing = byHospital.get(key)
    if (!existing) {
      byHospital.set(key, {
        hospitalName: entry.hospitalName,
        city: entry.hospitalCity,
        region: entry.hospitalRegion,
        visitCount: 1,
        lastVisit: entry.createdAt,
        isHome: !entry.isVisitingFacility,
      })
    } else {
      existing.visitCount += 1
      if (entry.createdAt > existing.lastVisit) existing.lastVisit = entry.createdAt
    }
  }

  return [...byHospital.values()].sort(
    (a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime()
  )
}

export async function getFacilityCareHistory(
  hospitalId: string,
  limit = 50
): Promise<any[]> {
  await ensureHospitalCareSchema()

  const rows = await db.query.hospitalCareEncounters.findMany({
    where: eq(hospitalCareEncounters.hospitalId, hospitalId),
    orderBy: [desc(hospitalCareEncounters.createdAt)],
    limit,
  })

  const userIds = [...new Set([
    ...rows.map((r) => r.patientUserId),
    ...rows.map((r) => r.staffUserId).filter(Boolean)
  ])] as string[]

  const userList =
    userIds.length > 0
      ? await db.query.users.findMany({
          where: inArray(users.id, userIds),
        })
      : []

  const userById = new Map(userList.map((u) => [u.id, u]))

  return rows.map((row) => {
    const patient = userById.get(row.patientUserId)
    const staff = row.staffUserId ? userById.get(row.staffUserId) : null
    
    return {
      id: row.id,
      pregnancyId: row.pregnancyId,
      patientUserId: row.patientUserId,
      patientName: patient ? `${patient.firstName} ${patient.lastName}`.trim() : 'Unknown Patient',
      action: row.action,
      actionLabel: ACTION_LABELS[row.action as CareEncounterAction] || row.action,
      summary: row.summary,
      staffName: staff ? `${staff.firstName} ${staff.lastName}`.trim() : 'Unknown Staff',
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : '',
    }
  })
}

