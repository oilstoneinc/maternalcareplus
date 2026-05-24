import { notifyPatientForPregnancy } from '@/lib/patient-notifications'

export async function notifyPregnancyUpdate(
  pregnancyId: string,
  message: string,
  event: 'mch-update' | 'vitals-update' | 'labs-update' | 'appointment' = 'mch-update'
) {
  await notifyPatientForPregnancy(pregnancyId, message, event, event)
}
