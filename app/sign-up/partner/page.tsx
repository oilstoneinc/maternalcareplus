'use client'

import { HeartPulse, Lock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function PartnerSignUpPage() {
  return (
    <div className="min-h-screen bg-[#F6F4F3] flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-md flex items-center justify-center gap-2 mb-8">
        <HeartPulse className="w-8 h-8 text-[#D48BA1]" />
        <span className="text-2xl font-black text-slate-800 tracking-tight">MaternalCare Plus</span>
      </div>

      <div className="w-full max-w-lg bg-white p-8 sm:p-10 rounded-3xl border border-slate-100 shadow-2xl text-center">
        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-3">Partner registration is closed</h1>
        <p className="text-sm text-slate-600 font-medium leading-relaxed mb-8">
          For your security, partners do not create separate accounts. Sign in with the{' '}
          <strong>mother&apos;s email and password</strong>, then enter the 6-character code she
          generates on her phone — you then get a <strong>read-only partner dashboard</strong>.
        </p>
        <Link
          href="/sign-in"
          className="inline-flex w-full items-center justify-center gap-2 py-4 text-sm font-black rounded-2xl text-white bg-indigo-600 hover:bg-indigo-700 transition-all"
        >
          Go to Sign In
        </Link>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#D48BA1]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to homepage
        </Link>
      </div>
    </div>
  )
}
