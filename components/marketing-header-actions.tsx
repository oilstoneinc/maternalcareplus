'use client'

import { ArrowRight } from 'lucide-react'
import InstallAppButton from '@/components/install-app-button'

export default function MarketingHeaderActions() {
  return (
    <div className="flex items-center gap-2 sm:gap-4">
      <InstallAppButton
        variant="ghost"
        className="hidden sm:inline-flex text-slate-600 hover:text-[#D48BA1]"
      />
      <a
        href="/sign-in"
        className="hidden sm:inline-flex text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
      >
        Provider Login
      </a>
      <a
        href="/sign-in"
        className="inline-flex items-center justify-center px-4 sm:px-6 py-2.5 border border-transparent text-sm font-black rounded-full text-white bg-slate-900 hover:bg-slate-800 shadow-md transition-all hover:scale-105"
      >
        <span className="hidden min-[400px]:inline">Patient Portal</span>
        <span className="min-[400px]:hidden">Sign in</span>
        <ArrowRight className="ml-2 w-4 h-4" />
      </a>
    </div>
  )
}
