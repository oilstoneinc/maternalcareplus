'use client'

import { Suspense } from 'react'
import { SignIn } from '@clerk/nextjs'
import { HeartPulse } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

function SignInContent() {
  const searchParams = useSearchParams()
  const partnerHint = searchParams.get('partner') === 'mother-account'

  return (
    <>
      {partnerHint && (
        <div className="w-full max-w-md mb-4 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-sm text-indigo-900 font-medium text-center leading-relaxed">
          Partners: sign in with the <strong>mother&apos;s email and password</strong>. You will then
          enter the invite code from her app before the dashboard opens.
        </div>
      )}

      <p className="text-center text-sm text-slate-500 mb-4 max-w-md leading-relaxed">
        <strong>Fathers / partners:</strong> use the pregnant woman&apos;s sign-in details (same email
        and password). After sign-in, enter the code she generates under{' '}
        <strong>Support your Partner</strong> on her phone. Separate partner accounts are not used.
      </p>

      <SignIn
        routing="path"
        path="/sign-in"
        fallbackRedirectUrl="/dashboard/pregnant-woman/partner-access"
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
