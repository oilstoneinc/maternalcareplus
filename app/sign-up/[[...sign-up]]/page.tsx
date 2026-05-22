'use client'

import { SignUp } from '@clerk/nextjs'
import { HeartPulse, Lock, ArrowLeft, Building, Users, ShieldAlert } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function SignUpPage() {
  const [hasTicket, setHasTicket] = useState<boolean | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ticket = params.get('__clerk_ticket') || params.get('ticket') || params.get('invitation_token')
    setHasTicket(!!ticket)
  }, [])

  return (
    <div className="min-h-screen bg-[#F6F4F3] flex flex-col items-center py-12 px-4">
      {/* Brand Header */}
      <div className="w-full max-w-md flex items-center justify-center gap-2 mb-10">
        <HeartPulse className="w-8 h-8 text-[#D48BA1]" />
        <span className="text-2xl font-black text-slate-800 tracking-tight">MaternalCare Plus</span>
      </div>

      <div className="w-full flex flex-col items-center">
        {hasTicket === null ? (
          // Shimmer loading state
          <div className="w-full max-w-[440px] bg-white p-8 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center py-16">
            <div className="w-12 h-12 bg-pink-50 rounded-full animate-pulse flex items-center justify-center mb-4">
              <HeartPulse className="w-6 h-6 text-[#D48BA1] animate-spin" />
            </div>
            <p className="text-slate-400 font-bold text-sm tracking-wider uppercase">Verifying Invitation...</p>
          </div>
        ) : hasTicket ? (
          // Render SignUp if invitation ticket is present
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Hospital Registration</h1>
              <p className="text-slate-600 font-medium">Join our digital health network to manage your patients.</p>
            </div>

            <SignUp 
              routing="path" 
              path="/sign-up" 
              signInUrl="/sign-in"
              fallbackRedirectUrl="/onboarding/hospital"
              appearance={{
                elements: {
                  rootBox: "w-full max-w-[440px] shadow-2xl rounded-2xl overflow-hidden",
                  card: "bg-white border-0 shadow-none p-8",
                  headerTitle: "text-slate-900 font-bold",
                  headerSubtitle: "text-slate-500",
                  formButtonPrimary: "bg-[#D48BA1] hover:bg-[#c47a90] text-sm font-bold py-3 rounded-xl transition-all shadow-md",
                  formFieldLabel: "text-slate-700 font-bold",
                  formFieldInput: "border-slate-200 focus:border-[#D48BA1] focus:ring-[#D48BA1] rounded-xl py-2.5",
                  footerActionLink: "text-[#D48BA1] hover:text-[#c47a90] font-bold",
                  identityPreviewTextPrimary: "text-slate-900",
                  dividerLine: "bg-slate-100",
                  dividerText: "text-slate-400 text-xs font-bold uppercase tracking-wider",
                },
                layout: {
                  shimmer: true,
                  logoPlacement: "none",
                  showOptionalFields: false,
                },
                variables: {
                  colorPrimary: "#D48BA1",
                  colorBackground: "#ffffff",
                  colorText: "#1e293b",
                  colorDanger: "#ef4444",
                  colorSuccess: "#8ABD8A",
                  borderRadius: "12px",
                }
              }}
            />
          </>
        ) : (
          // Premium Request Access layout when landing directly
          <div className="w-full max-w-lg bg-white p-8 sm:p-10 rounded-3xl border border-slate-100 shadow-2xl shadow-slate-200/50 flex flex-col items-center">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
              <Lock className="w-8 h-8 text-red-500" />
            </div>
            
            <h1 className="text-3xl font-black text-slate-900 tracking-tight text-center mb-2">Registration is Invite-Only</h1>
            <p className="text-slate-500 font-semibold text-center mb-8 text-sm leading-relaxed max-w-sm">
              MaternalCare Plus is a secure, clinical-grade network. Direct registration is locked to protect patient confidentiality.
            </p>

            <div className="w-full space-y-6 mb-8 text-left">
              <div className="flex gap-4 p-4 bg-[#F6F4F3] rounded-2xl border border-slate-50">
                <Building className="w-6 h-6 text-[#D48BA1] shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">Are you a Healthcare Institution?</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Hospitals must request access via the partnership portal. Request access on our <a href="/#partners" className="text-[#D48BA1] font-bold hover:underline">homepage</a>.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-[#F6F4F3] rounded-2xl border border-slate-50">
                <Users className="w-6 h-6 text-[#D48BA1] shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">Are you Clinical Staff?</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Nurses, midwives, and doctors are granted access directly by their hospital. Contact your hospital administrator to receive an invitation.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-[#F6F4F3] rounded-2xl border border-slate-50">
                <HeartPulse className="w-6 h-6 text-[#D48BA1] shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">Are you a Pregnant Mother?</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Mothers cannot sign up directly. Your hospital must onboard you first. You will receive an automated registration link via email when registered.
                  </p>
                </div>
              </div>
            </div>

            <a 
              href="/"
              className="w-full inline-flex items-center justify-center gap-2 py-4 border border-transparent text-sm font-black rounded-2xl text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-md"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Homepage
            </a>
          </div>
        )}
      </div>

      {/* Trust Badge */}
      <div className="mt-12 flex items-center gap-2 text-slate-400 text-sm font-medium">
        <div className="h-px w-8 bg-slate-200"></div>
        <span>Secure & Professional Health Platform</span>
        <div className="h-px w-8 bg-slate-200"></div>
      </div>
    </div>
  )
}
