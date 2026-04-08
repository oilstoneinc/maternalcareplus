import { ShieldAlert, LogOut, Home } from 'lucide-react'
import { SignOutButton } from '@clerk/nextjs'
import Link from 'next/link'

export default function UnauthorizedPage() {
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
          You don't have permission to access this section yet. This may happen if your hospital role is still being synchronized. 
          <br /><br />
          Please try refreshing or return to the main dashboard.
        </p>
        
        <div className="flex flex-col gap-4">
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
