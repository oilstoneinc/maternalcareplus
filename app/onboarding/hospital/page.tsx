import { completeHospitalProfile } from './actions'
import { Hospital, MapPin, Phone, Building2 } from 'lucide-react'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function HospitalOnboardingPage() {
  const { userId, sessionClaims } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  let role = (sessionClaims?.publicMetadata as any)?.role 
             || (sessionClaims?.unsafeMetadata as any)?.role

  if (!role) {
    try {
      const client = await clerkClient()
      const clerkUser = await client.users.getUser(userId)
      role = clerkUser.publicMetadata?.role as string
    } catch (e) {
      console.error('[HospitalOnboardingPage] Failed to fetch fresh Clerk metadata:', e)
    }
  }

  // If the user is a patient (pregnant woman), midwife, or father, they do not need facility setup!
  if (role && role !== 'hospital_staff') {
    if (role === 'pregnant_woman') {
      redirect('/dashboard/pregnant-woman')
    } else if (role === 'father') {
      redirect('/dashboard/father')
    } else if (role === 'midwife') {
      redirect('/dashboard/hospital')
    } else if (role === 'admin') {
      redirect('/dashboard/admin')
    }
  }
  return (
    <div className="min-h-screen bg-[#F6F4F3] flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8 bg-[#D48BA1] text-white">
          <div className="flex items-center gap-3 mb-2">
            <Hospital className="w-8 h-8" />
            <h1 className="text-3xl font-black tracking-tight">Complete Profile</h1>
          </div>
          <p className="text-[#F6F4F3] opacity-90 font-medium">Please provide your facility details to activate your dashboard.</p>
        </div>

        <form action={completeHospitalProfile} className="p-8 space-y-6">
          
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-400" />
              Facility Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Facility Name</label>
                <input 
                  type="text" 
                  name="name" 
                  required
                  placeholder="e.g. Ridge Hospital"
                  className="w-full border-slate-200 focus:border-[#D48BA1] focus:ring-[#D48BA1] rounded-xl py-2.5 shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Facility Type</label>
                <select 
                  name="type" 
                  required
                  className="w-full border-slate-200 focus:border-[#D48BA1] focus:ring-[#D48BA1] rounded-xl py-2.5 shadow-sm"
                  title="Facility Type"
                >
                  <option value="Hospital">Hospital</option>
                  <option value="Health Center">Health Center</option>
                  <option value="Clinic">Clinic</option>
                  <option value="Maternity Home">Maternity Home</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-slate-400" />
              Location & Contact
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Region</label>
                <select 
                  name="region" 
                  required
                  className="w-full border-slate-200 focus:border-[#D48BA1] focus:ring-[#D48BA1] rounded-xl py-2.5 shadow-sm"
                  title="Region"
                >
                  <option value="Greater Accra">Greater Accra</option>
                  <option value="Ashanti">Ashanti</option>
                  <option value="Western">Western</option>
                  <option value="Eastern">Eastern</option>
                  <option value="Central">Central</option>
                  <option value="Volta">Volta</option>
                  <option value="Northern">Northern</option>
                  <option value="Upper East">Upper East</option>
                  <option value="Upper West">Upper West</option>
                  <option value="Bono">Bono</option>
                  <option value="Bono East">Bono East</option>
                  <option value="Ahafo">Ahafo</option>
                  <option value="Oti">Oti</option>
                  <option value="Savannah">Savannah</option>
                  <option value="North East">North East</option>
                  <option value="Western North">Western North</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">City / District</label>
                <input 
                  type="text" 
                  name="city" 
                  required
                  placeholder="e.g. Accra"
                  className="w-full border-slate-200 focus:border-[#D48BA1] focus:ring-[#D48BA1] rounded-xl py-2.5 shadow-sm"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                  <Phone className="w-4 h-4 text-slate-400" />
                  Primary Phone
                </label>
                <input 
                  type="tel" 
                  name="phone" 
                  required
                  placeholder="+233 XX XXX XXXX"
                  className="w-full border-slate-200 focus:border-[#D48BA1] focus:ring-[#D48BA1] rounded-xl py-2.5 shadow-sm"
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              className="w-full bg-[#D48BA1] hover:bg-[#c47a90] text-white font-bold py-4 rounded-xl transition-all shadow-lg text-lg"
            >
              Save & Enter Dashboard
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
