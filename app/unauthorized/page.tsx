'use client'

import { useState } from 'react'
import { SignOutButton } from '@clerk/nextjs'
import { ShieldAlert, RefreshCcw, Home, LogOut, Loader2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { syncClerkAccount } from '@/app/actions'

export default function UnauthorizedPage() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleManualSync = async () => {
    setIsSyncing(true)
    setSyncStatus('idle')
    try {
      const result = await syncClerkAccount()
      if (result.success) {
        setSyncStatus('success')
        // Short delay to show success state before redirect
        setTimeout(() => {
          window.location.href = '/'
        }, 1500)
      } else {
        setSyncStatus('error')
        setErrorMessage(result.error || 'Failed to link account record.')
      }
    } catch (e) {
      setSyncStatus('error')
      setErrorMessage('Critical error during synchronization.')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 p-8 md:p-12 text-center border border-slate-100 flex flex-col items-center gap-8">
        
        {/* Animated Icon */}
        <div className="relative">
          <div className="absolute inset-0 bg-red-100 rounded-2xl blur-xl opacity-50 animate-pulse" />
          <div className="relative bg-red-50 p-4 rounded-2xl border border-red-100">
            <ShieldAlert className="h-10 w-10 text-red-500" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
            Access Restricted
          </h1>
          <p className="text-slate-500 font-medium leading-relaxed">
            Your account doesn't have an assigned role yet. This happens when the provider account hasn't been fully activated in the database.
          </p>
        </div>

        {/* Sync Status Badge */}
        <div className="w-full bg-slate-50 rounded-2xl p-4 flex flex-col gap-2 border border-slate-100">
           <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Status</span>
              {syncStatus === 'success' ? (
                <span className="text-[10px] font-black uppercase tracking-widest text-green-500 flex items-center gap-1">
                   <CheckCircle2 className="h-3 w-3" /> Activated
                </span>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-widest text-red-500 animate-pulse">Pending Activation</span>
              )}
           </div>
           <p className="text-sm font-bold text-slate-700 text-left flex items-center gap-2">
              Role: <span className={syncStatus === 'success' ? 'text-green-600' : 'text-red-500 uppercase'}>
                {syncStatus === 'success' ? 'Hospital Administrator' : 'Unassigned'}
              </span>
           </p>
        </div>

        <div className="w-full flex flex-col gap-3">
          <button 
            onClick={handleManualSync}
            disabled={isSyncing || syncStatus === 'success'}
            className="group relative w-full px-6 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 text-white rounded-2xl font-bold transition-all transform hover:-translate-y-1 active:scale-95 shadow-lg shadow-emerald-100 disabled:shadow-none flex items-center justify-center gap-2 overflow-hidden"
          >
            {isSyncing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : syncStatus === 'success' ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <RefreshCcw className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500" />
            )}
            <span>{isSyncing ? 'Linking Database...' : syncStatus === 'success' ? 'Activated! Redirecting...' : 'Force Sync & Activate'}</span>
          </button>

          {syncStatus === 'error' && (
            <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{errorMessage}</p>
          )}

          <Link 
            href="/"
            className="w-full px-6 py-4 bg-rose-200/50 hover:bg-rose-200 text-rose-700 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 border border-rose-200"
          >
            <Home className="h-5 w-5" />
            <span>Return Home</span>
          </Link>

          <SignOutButton>
            <button className="w-full px-6 py-4 bg-white hover:bg-slate-50 text-slate-400 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 border border-slate-100">
              <LogOut className="h-5 w-5" />
              <span>Sign out</span>
            </button>
          </SignOutButton>
        </div>
      </div>

      <p className="mt-8 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
        © 2026 MaternalCare Plus | Secure Provider Portal
      </p>
    </div>
  )
}
