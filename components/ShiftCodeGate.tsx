'use client'

import React, { useState, useEffect } from 'react'
import { verifyHospitalShiftCode, generateHospitalShiftCode } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useClerk } from '@clerk/nextjs'
import { 
  ShieldAlert, 
  Lock, 
  Key, 
  CheckCircle, 
  RefreshCw, 
  LogOut, 
  AlertCircle,
  Building,
  Heart
} from 'lucide-react'

interface ShiftCodeGateProps {
  dbUser: any
  hospital: any
  children: React.ReactNode
}

export default function ShiftCodeGate({ dbUser, hospital, children }: ShiftCodeGateProps) {
  const { signOut } = useClerk()
  const [code, setCode] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Admin action states
  const [adminGenerating, setAdminGenerating] = useState(false)
  const [currentShiftCode, setCurrentShiftCode] = useState<string | null>(hospital?.shiftCode || null)

  const userRole = dbUser?.role
  const hospitalName = hospital?.name || 'MaternalCare Plus Clinic'

  // Determine if code is already verified today
  useEffect(() => {
    if (dbUser?.lastShiftCodeVerified && hospital?.shiftCode && dbUser.lastShiftCodeVerified === hospital.shiftCode) {
      // Check if verified today (expires at 23:59:59.999 of the day it was verified)
      const lastVerifiedDate = dbUser.lastShiftCodeVerifiedAt ? new Date(dbUser.lastShiftCodeVerifiedAt) : null
      if (lastVerifiedDate && lastVerifiedDate.getDate() === new Date().getDate()) {
        setIsVerified(true)
      }
    }
  }, [dbUser, hospital])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || code.length !== 6) {
      setError('Please enter a valid 6-digit shift code')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await verifyHospitalShiftCode(code)
      if (result.success) {
        setIsVerified(true)
        window.location.reload()
      } else {
        setError(result.error || 'Failed to verify shift code')
      }
    } catch (err) {
      console.error('Verify error:', err)
      setError('A system error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateCode = async () => {
    setAdminGenerating(true)
    setError(null)
    try {
      const result = await generateHospitalShiftCode()
      if (result.success && result.shiftCode) {
        setCurrentShiftCode(result.shiftCode)
        setError(null)
      } else {
        setError(result.error || 'Failed to generate new shift code')
      }
    } catch (err) {
      console.error('Generate code error:', err)
      setError('Failed to generate shift code. Please retry.')
    } finally {
      setAdminGenerating(false)
    }
  }

  const handleSignOut = () => {
    signOut(() => {
      window.location.href = '/sign-in'
    })
  }

  // Only hospital_staff and midwife must verify — admin (main hospital account) goes straight through
  if (!userRole || userRole === 'admin' || (userRole !== 'hospital_staff' && userRole !== 'midwife')) {
    return <>{children}</>
  }

  if (isVerified) {
    return <>{children}</>
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A]/90 backdrop-blur-lg flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col relative animate-in fade-in zoom-in-95 duration-300">
        
        {/* Top styling strip */}
        <div className="h-2 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600" />

        {/* Content */}
        <div className="p-8 flex-1 flex flex-col">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="h-16 w-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-teal-100 shadow-inner">
              <Lock className="h-8 w-8 text-teal-600 animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Shift Verification Required</h2>
            <p className="text-sm text-slate-500 mt-1 font-medium flex items-center justify-center gap-1.5">
              <Building className="h-4 w-4 text-slate-400" /> {hospitalName}
            </p>
          </div>

          {/* Secure Message */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Clinical Security Guard</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Shared terminal safety: to access patient records and serve pregnant women professionally, please enter today's shift code.
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-sm mb-6 flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="shift-code-input" className="text-xs font-bold text-slate-600 uppercase tracking-wider block text-left">
                6-Digit Daily Shift Code
              </label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  id="shift-code-input"
                  type="text"
                  maxLength={6}
                  placeholder="0 0 0 0 0 0"
                  className="pl-12 pr-4 py-6 rounded-2xl text-center font-mono text-2xl tracking-[0.7em] focus:ring-2 focus:ring-teal-500 border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 transition-all font-bold placeholder:text-slate-300 placeholder:tracking-normal placeholder:text-sm"
                  value={code}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '')
                    setCode(val)
                  }}
                  disabled={loading}
                  autoComplete="off"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-6 rounded-2xl font-bold text-base shadow-lg shadow-teal-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              disabled={loading || code.length !== 6}
            >
              {loading ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Verifying Shift Code...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Verify & Start Shift
                </>
              )}
            </Button>
          </form>

          {/* Admin Code Generation Panel */}
          {(userRole === 'hospital_staff' || userRole === 'admin') && (
            <div className="mt-8 border-t border-slate-100 pt-6">
              <div className="bg-teal-50/50 rounded-2xl p-4 border border-teal-100/50 text-left">
                <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-2">Hospital Administrator Panel</h4>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  Generate today's daily shift code for midwives, doctors, and nursing staff. Distribute this code to active personnel on duty.
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 py-2.5 rounded-xl border border-teal-200 hover:bg-teal-100/30 text-teal-700 text-xs font-bold transition-all active:scale-95"
                    onClick={handleGenerateCode}
                    disabled={adminGenerating}
                  >
                    {adminGenerating ? 'Generating...' : currentShiftCode ? 'Regenerate Code' : 'Generate Shift Code'}
                  </Button>
                  
                  {currentShiftCode && (
                    <div className="px-4 py-2 bg-white rounded-xl border border-teal-200 font-mono font-black text-teal-700 tracking-wider text-base text-center shadow-sm">
                      {currentShiftCode}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-6 flex justify-between items-center text-xs text-slate-400">
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-1 hover:text-slate-600 font-bold transition-colors"
            >
              <LogOut className="h-4 w-4 text-slate-400" />
              Sign Out
            </button>
            <span className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" /> MaternalCare Plus Security
            </span>
          </div>

        </div>
      </div>
    </div>
  )
}
