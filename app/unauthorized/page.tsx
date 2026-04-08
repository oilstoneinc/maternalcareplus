import { ShieldAlert, LogOut, Home, RefreshCw, Key } from 'lucide-react'
import { SignOutButton } from '@clerk/nextjs'
import Link from 'next/link'
import { getUserRole } from '@/lib/clerk'
import { redirect } from 'next/navigation'

export default async function UnauthorizedPage() {
  // Perform a LIVE check against the Clerk API (bypassing cached session claims)
  const role = await getUserRole(true)

  // If a role IS found during the live check, redirect them back to the dashboard!
  if (role) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-[#F6F4F3] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-10 border border-slate-100">
        <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-8">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        
        <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">
          Access Restricted
        </h1>
        
        <p className="text-slate-600 mb-10 leading-relaxed font-medium">
          Your account doesn't have an assigned role yet. This happens when the provider account hasn't been fully activated in the system.
        </p>
        
        <div className="space-y-4 mb-10">
           <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                 <Key className="w-4 h-4" />
                 <span className="text-xs font-bold uppercase tracking-wider">Current Status</span>
              </div>
              <p className="font-bold text-slate-700">Role: <span className="text-red-500 font-black">UNASSIGNED</span></p>
           </div>
        </div>

        <div className="flex flex-col gap-4">
          <Link 
            href="/unauthorized"
            className="w-full bg-[#8ABD8A] text-white font-bold py-4 rounded-xl hover:bg-[#7aa97a] transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100 transform active:scale-95"
          >
            <RefreshCw className="w-5 h-5" />
            Check Activation Again
          </Link>

          <Link 
            href="/"
            className="w-full bg-[#D48BA1] text-white font-bold py-4 rounded-xl hover:bg-[#c47a90] transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Return Home
          </Link>
          
          <div className="w-full border-2 border-slate-100 text-slate-500 font-bold py-3.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 cursor-pointer">
            <LogOut className="w-5 h-5" />
            <SignOutButton />
          </div>
        </div>
      </div>
      
      <p className="mt-8 text-slate-400 text-sm font-semibold">
        © 2026 MaternalCare Plus | Secure Portal
      </p>
    </div>
  )
}
