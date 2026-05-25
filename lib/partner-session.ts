import { cookies } from 'next/headers'

/** Mother's trusted device — full pregnant woman dashboard (value: `{clerkUserId}:{pregnancyId}`) */
export const PW_DEVICE_COOKIE = 'mc_pw_device_verified'

/** Partner read-only session after invite code (value: `{clerkUserId}:{pregnancyId}`) */
export const PARTNER_SESSION_COOKIE = 'mc_partner_readonly'

function parseSessionCookie(
  raw: string | undefined,
  clerkUserId: string
): string | null {
  if (!raw) return null
  const [uid, pregnancyId] = raw.split(':')
  if (uid !== clerkUserId || !pregnancyId) return null
  return pregnancyId
}

export async function getVerifiedPregnancyId(clerkUserId: string): Promise<string | null> {
  const jar = await cookies()
  return parseSessionCookie(jar.get(PW_DEVICE_COOKIE)?.value, clerkUserId)
}

export async function setVerifiedPregnancyDevice(clerkUserId: string, pregnancyId: string) {
  await clearPartnerReadonlySession()
  const jar = await cookies()
  jar.set(PW_DEVICE_COOKIE, `${clerkUserId}:${pregnancyId}`, {
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

export async function getPartnerSessionPregnancyId(clerkUserId: string): Promise<string | null> {
  const jar = await cookies()
  return parseSessionCookie(jar.get(PARTNER_SESSION_COOKIE)?.value, clerkUserId)
}

export async function setPartnerReadonlySession(clerkUserId: string, pregnancyId: string) {
  await clearVerifiedPregnancyDevice()
  const jar = await cookies()
  jar.set(PARTNER_SESSION_COOKIE, `${clerkUserId}:${pregnancyId}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
  })
}

export async function clearPartnerReadonlySession() {
  const jar = await cookies()
  jar.delete(PARTNER_SESSION_COOKIE)
}

export async function hasPartnerReadonlySession(clerkUserId: string): Promise<boolean> {
  return !!(await getPartnerSessionPregnancyId(clerkUserId))
}

/** New accounts completing hospital invite may use the dashboard on first device without a code */
export function isWithinPrimaryDeviceGraceWindow(createdAt: Date | string | number): boolean {
  const created = new Date(createdAt).getTime()
  if (Number.isNaN(created)) return false
  const hours = (Date.now() - created) / (1000 * 60 * 60)
  return hours <= 48
}
