'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useClerk } from '@clerk/nextjs'
import { logStaffSessionEnd } from '@/app/actions'

export interface SessionTimeoutOptions {
  /** Countdown timeout in milliseconds. Default: 8 hours (one work shift) */
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
  /** Call this to manually reset/extend the timer (ignored in strict mode) */
  resetTimer: () => void
  /** Call this to immediately sign out */
  signOutNow: () => void
}

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
      // Deactivate user's active shift verification in DB and log session end
      await logStaffSessionEnd()
    } catch (e) {
      console.error('Failed to log staff session end:', e)
    }
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

  const initTimer = useCallback(() => {
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

  // Kick off the strict unstoppable countdown timer when mounted
  useEffect(() => {
    initTimer()
    return () => {
      clearAllTimers()
    }
  }, [initTimer, clearAllTimers])

  return {
    secondsRemaining,
    isWarning,
    isExpired,
    resetTimer: () => {}, // Strict mode: ignore resets
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
