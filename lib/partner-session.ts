import { cookies } from 'next/headers'

/** HttpOnly cookie: `{dbUserId}:{pregnancyId}` — one browser/device at a time until verified */
export const PW_DEVICE_COOKIE = 'mc_pw_device_verified'

export async function getVerifiedPregnancyId(dbUserId: string): Promise<string | null> {
  const jar = await cookies()
  const raw = jar.get(PW_DEVICE_COOKIE)?.value
  if (!raw) return null
  const [uid, pregnancyId] = raw.split(':')
  if (uid !== dbUserId || !pregnancyId) return null
  return pregnancyId
}

export async function setVerifiedPregnancyDevice(dbUserId: string, pregnancyId: string) {
  const jar = await cookies()
  jar.set(PW_DEVICE_COOKIE, `${dbUserId}:${pregnancyId}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
  })
}

export async function clearVerifiedPregnancyDevice() {
  const jar = await cookies()
  jar.delete(PW_DEVICE_COOKIE)
}

/** New accounts completing hospital invite may use the dashboard on first device without a code */
export function isWithinPrimaryDeviceGraceWindow(createdAt: Date | string | number): boolean {
  const created = new Date(createdAt).getTime()
  if (Number.isNaN(created)) return false
  const hours = (Date.now() - created) / (1000 * 60 * 60)
  return hours <= 48
}
