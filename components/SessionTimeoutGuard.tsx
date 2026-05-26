'use client'

import { useSessionTimeout, formatCountdown } from '@/hooks/useSessionTimeout'
import { Shield, LogOut, Clock, AlertTriangle, Timer } from 'lucide-react'
import { useEffect, useState } from 'react'

interface SessionTimeoutGuardProps {
  children: React.ReactNode
  /** Role of the current user. Guard only activates for clinical roles. */
  role: string
  /** Staff display name (e.g. "Abena Mensah") for the UI */
  staffName?: string
  /**
   * Session timeout in hours. Admin-configurable.
   * Default: 8 hours (one clinical work shift).
   */
  sessionHours?: number
}

const CLINICAL_ROLES = ['hospital_staff', 'midwife', 'admin']

/** Minutes before expiry at which the warning is triggered */
const WARNING_MINUTES = 2

export default function SessionTimeoutGuard({
  children,
  role,
  staffName,
  sessionHours = 8,
}: SessionTimeoutGuardProps) {
  const isClinicalRole = CLINICAL_ROLES.includes(role)

  // Always call hooks — conditionally render based on isClinicalRole
  const {
    secondsRemaining,
    isWarning,
    isExpired,
    resetTimer,
    signOutNow,
  } = useSessionTimeout({
    timeoutMs: sessionHours * 60 * 60 * 1000,
    warningMs: WARNING_MINUTES * 60 * 1000,
    redirectUrl: '/sign-in',
  })

  const [showBadge, setShowBadge] = useState(false)

  // Show the floating badge once the page has mounted (avoids hydration flash)
  useEffect(() => {
    if (isClinicalRole) {
      const t = setTimeout(() => setShowBadge(true), 800)
      return () => clearTimeout(t)
    }
  }, [isClinicalRole])

  if (!isClinicalRole) {
    // Patients, fathers, etc. — no timeout guard
    return <>{children}</>
  }

  const isLowTime = secondsRemaining <= 10 * 60 // last 10 minutes → amber
  const isCritical = secondsRemaining <= WARNING_MINUTES * 60 // last 2 min → red

  return (
    <>
      {children}

      {/* ── Floating session timer badge ─────────────────────────────── */}
      {showBadge && !isExpired && (
        <div
          className={`
            fixed bottom-5 right-5 z-[9999]
            flex items-center gap-2.5
            px-4 py-2.5 rounded-2xl shadow-2xl
            border backdrop-blur-sm
            transition-all duration-300 select-none
            ${
              isCritical
                ? 'bg-red-600/95 border-red-400 text-white animate-pulse'
                : isLowTime
                ? 'bg-amber-500/95 border-amber-300 text-white'
                : 'bg-slate-900/90 border-slate-700 text-slate-100'
            }
          `}
          title="Your session will automatically expire when the timer reaches 0:00"
        >
          <Timer className={`w-4 h-4 shrink-0 ${isCritical ? 'animate-spin' : ''}`} />
          <div className="flex flex-col leading-none">
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-70">
              Session expires in
            </span>
            <span className="font-mono font-black text-base tabular-nums">
              {formatCountdown(secondsRemaining)}
            </span>
          </div>
          {isLowTime && (
            <button
              onClick={resetTimer}
              className="ml-1 text-[10px] font-black uppercase tracking-wider bg-white/20 hover:bg-white/30 rounded-lg px-2 py-1 transition-colors"
              title="Extend session"
            >
              Extend
            </button>
          )}
        </div>
      )}

      {/* ── Warning modal overlay ─────────────────────────────────────── */}
      {isWarning && !isExpired && (
        <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            {/* Red header */}
            <div className="bg-red-600 px-8 py-6 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-9 h-9 text-white" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">Session Expiring Soon</h2>
              <p className="text-red-100 text-sm font-medium mt-1">
                For patient data security, you will be automatically signed out.
              </p>
            </div>

            {/* Body */}
            <div className="px-8 py-6 text-center space-y-5">
              {/* Giant countdown */}
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-8 py-5">
                  <Clock className="w-6 h-6 text-red-500" />
                  <span className="font-mono font-black text-5xl text-red-600 tabular-nums">
                    {formatCountdown(secondsRemaining)}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-3">
                  Until automatic sign-out
                </p>
              </div>

              {/* Context info */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-400 shrink-0" />
                  <p className="text-sm font-semibold text-slate-700">
                    MaternalCare Plus — Clinical Security Protocol
                  </p>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed pl-6">
                  Sessions for clinical staff automatically expire after{' '}
                  <strong>{sessionHours} hours</strong> of inactivity to prevent
                  unauthorised access to patient records from shared or unattended devices.
                </p>
                {staffName && (
                  <p className="text-xs text-slate-400 pl-6">
                    Signed in as: <span className="font-bold text-slate-600">{staffName}</span>
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={resetTimer}
                  className="w-full py-4 bg-[#D48BA1] hover:bg-[#c47a90] text-white font-black rounded-2xl text-base transition-all shadow-lg shadow-pink-200 active:scale-95"
                >
                  I'm Still Here — Keep Me Signed In
                </button>
                <button
                  onClick={signOutNow}
                  className="w-full py-3.5 border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Expired / signed-out overlay ─────────────────────────────── */}
      {isExpired && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-20 h-20 bg-red-500/20 rounded-3xl flex items-center justify-center mx-auto">
              <LogOut className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-2xl font-black text-white">Session Ended</h2>
            <p className="text-slate-400 font-medium text-sm leading-relaxed">
              Your clinical session has expired. Please sign in again to access patient records.
            </p>
            <button
              onClick={() => (window.location.href = '/sign-in')}
              className="mt-4 px-8 py-3.5 bg-[#D48BA1] hover:bg-[#c47a90] text-white font-black rounded-2xl transition-all shadow-lg"
            >
              Return to Sign In
            </button>
          </div>
        </div>
      )}
    </>
  )
}
