'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useClerk } from '@clerk/nextjs'

export interface SessionTimeoutOptions {
  /** Inactivity timeout in milliseconds. Default: 8 hours (one work shift) */
  timeoutMs?: number
  /** Show a warning this many ms before timeout. Default: 2 minutes */
  warningMs?: number
  /** Redirect path after sign-out */
  redirectUrl?: string
}

export interface SessionTimeoutState {
  /** Seconds remaining until timeout */
  secondsRemaining: number
  /** True when warning modal should be shown (warningMs before timeout) */
  isWarning: boolean
  /** True when the user has already been signed out */
  isExpired: boolean
  /** Call this to manually reset the timer (e.g. user clicks "I'm still here") */
  resetTimer: () => void
  /** Call this to immediately sign out */
  signOutNow: () => void
}

const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'wheel',
  'click',
  'focus',
]

export function useSessionTimeout({
  timeoutMs = 8 * 60 * 60 * 1000, // 8-hour shift default
  warningMs = 2 * 60 * 1000,       // warn 2 minutes before
  redirectUrl = '/sign-in',
}: SessionTimeoutOptions = {}): SessionTimeoutState {
  const { signOut } = useClerk()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const expiresAtRef = useRef<number>(Date.now() + timeoutMs)

  const [secondsRemaining, setSecondsRemaining] = useState(Math.floor(timeoutMs / 1000))
  const [isWarning, setIsWarning] = useState(false)
  const [isExpired, setIsExpired] = useState(false)

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  const doSignOut = useCallback(async () => {
    setIsExpired(true)
    clearAllTimers()
    try {
      await signOut({ redirectUrl })
    } catch {
      // Fallback hard redirect
      window.location.href = redirectUrl
    }
  }, [signOut, redirectUrl, clearAllTimers])

  const startCountdownTick = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAtRef.current - Date.now()) / 1000))
      setSecondsRemaining(remaining)
      if (remaining <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }, 1000)
  }, [])

  const resetTimer = useCallback(() => {
    clearAllTimers()
    setIsWarning(false)
    setIsExpired(false)
    expiresAtRef.current = Date.now() + timeoutMs
    setSecondsRemaining(Math.floor(timeoutMs / 1000))

    // Schedule warning
    warningRef.current = setTimeout(() => {
      setIsWarning(true)
    }, timeoutMs - warningMs)

    // Schedule auto sign-out
    timeoutRef.current = setTimeout(() => {
      doSignOut()
    }, timeoutMs)

    // Restart tick
    startCountdownTick()
  }, [timeoutMs, warningMs, clearAllTimers, doSignOut, startCountdownTick])

  // Attach activity listeners
  useEffect(() => {
    const handleActivity = () => {
      // Only reset if NOT already in the warning period.
      // Once the warning fires, staff must actively click "Stay Logged In" to reset.
      if (!isWarning && !isExpired) {
        resetTimer()
      }
    }

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, handleActivity, { passive: true })
    )

    // Kick off the initial timer
    resetTimer()

    return () => {
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, handleActivity)
      )
      clearAllTimers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally empty — resetTimer is stable via useCallback with stable deps

  // When warning state changes, restart activity detection after warning
  useEffect(() => {
    if (!isWarning) return
    // During warning: stop responding to activity (freeze the countdown so
    // staff must explicitly click "Stay Logged In" to reset)
    ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer))
  }, [isWarning, resetTimer])

  return {
    secondsRemaining,
    isWarning,
    isExpired,
    resetTimer,
    signOutNow: doSignOut,
  }
}

/** Formats seconds into HH:MM:SS or MM:SS */
export function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
