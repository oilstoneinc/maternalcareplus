import { redirect } from 'next/navigation'

/** Legacy father accounts — partners now use the mother's sign-in + invite code */
export default async function FatherDashboard() {
  redirect('/sign-in?partner=mother-account')
}
