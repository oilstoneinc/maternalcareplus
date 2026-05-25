'use client'

import { Suspense } from 'react'
import { SignIn } from '@clerk/nextjs'
import { HeartPulse } from 'lucide-react'

function SignInContent() {
  return (
    <>
      <p className="text-center text-sm text-slate-500 mb-4 max-w-md leading-relaxed">
        <strong>Mothers and partners</strong> each use the email address the hospital registered.
        Partners receive a separate invitation with read-only access.
      </p>

      <SignIn
        routing="path"
        path="/sign-in"
        fallbackRedirectUrl="/dashboard"
        appearance={{
          elements: {
            rootBox: 'w-full max-w-[440px] shadow-2xl rounded-2xl overflow-hidden',
            card: 'bg-white border-0 shadow-none p-8',
            headerTitle: 'text-slate-900 font-bold',
            headerSubtitle: 'text-slate-500',
            formButtonPrimary:
              'bg-[#D48BA1] hover:bg-[#c47a90] text-sm font-bold py-3 rounded-xl transition-all shadow-md',
            formFieldLabel: 'text-slate-700 font-bold',
            formFieldInput:
              'border-slate-200 focus:border-[#D48BA1] focus:ring-[#D48BA1] rounded-xl py-2.5',
            footerAction: 'hidden',
            footerActionLink: 'text-[#D48BA1] hover:text-[#c47a90] font-bold',
            identityPreviewTextPrimary: 'text-slate-900',
            dividerLine: 'bg-slate-100',
            dividerText: 'text-slate-400 text-xs font-bold uppercase tracking-wider',
          },
          layout: {
            shimmer: true,
            logoPlacement: 'none',
            showOptionalFields: false,
          },
          variables: {
            colorPrimary: '#D48BA1',
            colorBackground: '#ffffff',
            colorText: '#1e293b',
            colorDanger: '#ef4444',
            colorSuccess: '#8ABD8A',
            borderRadius: '12px',
          },
        }}
      />
    </>
  )
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#F6F4F3] flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-md flex items-center justify-center gap-2 mb-10">
        <HeartPulse className="w-8 h-8 text-[#D48BA1]" />
        <span className="text-2xl font-black text-slate-800 tracking-tight">MaternalCare Plus</span>
      </div>

      <div className="w-full flex flex-col items-center">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Member Sign In</h1>
          <p className="text-slate-600 font-medium">Access your maternal care dashboard.</p>
        </div>

        <Suspense fallback={<div className="h-96 w-full max-w-[440px] animate-pulse bg-white rounded-2xl" />}>
          <SignInContent />
        </Suspense>
      </div>

      <div className="mt-12 flex items-center gap-2 text-slate-400 text-sm font-medium">
        <div className="h-px w-8 bg-slate-200"></div>
        <span>Authorized Access Only</span>
        <div className="h-px w-8 bg-slate-200"></div>
      </div>
    </div>
  )
}
