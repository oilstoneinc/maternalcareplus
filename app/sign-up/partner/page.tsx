'use client'

import { SignUp } from '@clerk/nextjs'
import { HeartPulse, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function PartnerSignUpPage() {
  return (
    <div className="min-h-screen bg-[#F6F4F3] flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-md flex items-center justify-center gap-2 mb-8">
        <HeartPulse className="w-8 h-8 text-[#D48BA1]" />
        <span className="text-2xl font-black text-slate-800 tracking-tight">MaternalCare Plus</span>
      </div>

      <div className="w-full max-w-lg text-center mb-6 space-y-2">
        <h1 className="text-2xl font-black text-slate-900">Partner / Father registration</h1>
        <p className="text-sm text-slate-600 font-medium leading-relaxed">
          Create your account, then sign in and enter the <strong>6-character code</strong> your partner
          shared from her dashboard under <strong>Support your Partner</strong>.
        </p>
      </div>

      <SignUp
        routing="path"
        path="/sign-up/partner"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/dashboard/father"
        unsafeMetadata={{ role: 'father' }}
        appearance={{
          elements: {
            rootBox: 'w-full max-w-[440px] shadow-2xl rounded-2xl overflow-hidden',
            card: 'bg-white border-0 shadow-none p-8',
            formButtonPrimary:
              'bg-indigo-600 hover:bg-indigo-700 text-sm font-bold py-3 rounded-xl transition-all shadow-md',
          },
        }}
      />

      <Link
        href="/sign-in"
        className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#D48BA1]"
      >
        <ArrowLeft className="w-4 h-4" />
        Already have an account? Sign in
      </Link>
    </div>
  )
}
