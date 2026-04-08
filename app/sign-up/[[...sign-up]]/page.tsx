'use client'

import { SignUp } from '@clerk/nextjs'
import { HeartPulse } from 'lucide-react'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#F6F4F3] flex flex-col items-center py-12 px-4">
      {/* Brand Header */}
      <div className="w-full max-w-md flex items-center justify-center gap-2 mb-10">
        <HeartPulse className="w-8 h-8 text-[#D48BA1]" />
        <span className="text-2xl font-black text-slate-800 tracking-tight">MaternalCare Plus</span>
      </div>

      <div className="w-full flex flex-col items-center">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Hospital Registration</h1>
          <p className="text-slate-600 font-medium">Join our digital health network to manage your patients.</p>
        </div>

        <SignUp 
          routing="path" 
          path="/sign-up" 
          signInUrl="/sign-in"
          fallbackRedirectUrl="/dashboard/hospital"
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
