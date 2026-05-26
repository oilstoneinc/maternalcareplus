'use client'

import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export default function PwaProvider() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [showIosHint, setShowIosHint] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || isStandalone()) return

    const dismissedKey = 'mc_pwa_install_dismissed'
    if (localStorage.getItem(dismissedKey) === '1') {
      setDismissed(true)
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW optional for install on some browsers; fail silently
      })
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      if (localStorage.getItem(dismissedKey) !== '1') {
        setShowBanner(true)
      }
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    if (isIos() && localStorage.getItem(dismissedKey) !== '1') {
      setShowIosHint(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  const dismiss = () => {
    setShowBanner(false)
    setShowIosHint(false)
    setDismissed(true)
    localStorage.setItem('mc_pwa_install_dismissed', '1')
  }

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setShowBanner(false)
  }

  if (isStandalone() || dismissed) return null

  if (showBanner && deferredPrompt) {
    return (
      <div
        role="dialog"
        aria-label="Install MaternalCare Plus"
        className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-lg rounded-2xl border border-pink-100 bg-white p-4 shadow-2xl shadow-pink-200/40 md:left-auto md:right-6"
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex gap-3 pr-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D48BA1] to-[#e6a8bc] text-white">
            <Download className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-black text-slate-900">Install MaternalCare Plus</p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Add to your home screen or desktop for quick access to your care portal.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                size="sm"
                className="bg-[#D48BA1] hover:bg-[#c47a90] font-bold"
                onClick={handleInstall}
              >
                Install app
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={dismiss}>
                Not now
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (showIosHint && isIos()) {
    return (
      <div
        role="dialog"
        aria-label="Add to Home Screen"
        className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-lg rounded-2xl border border-pink-100 bg-white p-4 shadow-2xl md:left-auto md:right-6"
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 rounded-full p-1 text-slate-400 hover:bg-slate-100"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex gap-3 pr-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F6F4F3] text-[#D48BA1]">
            <Share className="h-6 w-6" />
          </div>
          <div>
            <p className="font-black text-slate-900">Add to Home Screen</p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Tap <strong>Share</strong> in Safari, then <strong>Add to Home Screen</strong> to install
              MaternalCare Plus on your iPhone.
            </p>
            <Button type="button" size="sm" variant="ghost" className="mt-2" onClick={dismiss}>
              Got it
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
