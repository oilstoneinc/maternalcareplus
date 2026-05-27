'use client'

import { useSessionTimeout, formatCountdown } from '@/hooks/useSessionTimeout'
import { Shield, LogOut, Clock, AlertTriangle } from 'lucide-react'
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

      {/* ── Warning modal overlay ─────────────────────────────────────── */}
      {isWarning && !isExpired && (
        <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            {/* Red header */}
            <div className="bg-red-600 px-8 py-6 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-9 h-9 text-white" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">Shift Session Ending</h2>
              <p className="text-red-100 text-sm font-medium mt-1">
                Your 8-hour clinical shift session is about to expire.
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
                  Until shift session ends
                </p>
              </div>

              {/* Context info */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-400 shrink-0" />
                  <p className="text-sm font-semibold text-slate-700">
                    Clinical Security Protocol
                  </p>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed pl-6">
                  For security, shift sessions automatically expire after <strong>{sessionHours} hours</strong>. Once expired, you will need to log back in and request the main hospital administrator to generate today's shift code.
                </p>
                {staffName && (
                  <p className="text-xs text-slate-400 pl-6">
                    Active Personnel: <span className="font-bold text-slate-600">{staffName}</span>
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={signOutNow}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl text-base transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                >
                  <LogOut className="w-5 h-5" />
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
            <h2 className="text-2xl font-black text-white">Shift Session Ended</h2>
            <p className="text-slate-400 font-medium text-sm leading-relaxed">
              Your 8-hour clinical shift has ended. Please sign in again and verify with today's shift code from your hospital administrator to resume serving patients.
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
