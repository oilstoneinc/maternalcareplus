'use client'

import InstallAppButton from '@/components/install-app-button'

export default function InstallAppFooter() {
  return (
    <div className="mt-6 flex flex-col items-center gap-3 border-t border-slate-200/80 pt-6">
      <p className="text-sm font-semibold text-slate-600">
        Use MaternalCare Plus on your phone or computer
      </p>
      <InstallAppButton variant="default" size="default" className="bg-[#D48BA1] hover:bg-[#c47a90] text-white" />
      <p className="text-[10px] font-medium text-slate-400 max-w-xs">
        On iPhone: tap Install app for step-by-step Add to Home Screen instructions.
      </p>
    </div>
  )
}
