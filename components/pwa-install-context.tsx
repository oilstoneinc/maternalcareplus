'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { Download, Share, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  type BeforeInstallPromptEvent,
  isIos,
  isStandalone,
  PWA_DISMISS_KEY,
} from '@/lib/pwa-utils'

type PwaInstallContextValue = {
  canInstall: boolean
  isInstalled: boolean
  hasNativePrompt: boolean
  isIosDevice: boolean
  requestInstall: () => Promise<void>
  openIosInstructions: () => void
}

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null)

export function usePwaInstall() {
  const ctx = useContext(PwaInstallContext)
  if (!ctx) {
    throw new Error('usePwaInstall must be used within PwaInstallProvider')
  }
  return ctx
}

export function usePwaInstallOptional() {
  return useContext(PwaInstallContext)
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [showIosModal, setShowIosModal] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setInstalled(isStandalone())
    if (localStorage.getItem(PWA_DISMISS_KEY) === '1') {
      setDismissed(true)
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined)
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      if (localStorage.getItem(PWA_DISMISS_KEY) !== '1' && !isStandalone()) {
        setShowBanner(true)
      }
    }

    const onInstalled = () => {
      setInstalled(true)
      setShowBanner(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const dismiss = useCallback(() => {
    setShowBanner(false)
    setShowIosModal(false)
    setDismissed(true)
    localStorage.setItem(PWA_DISMISS_KEY, '1')
  }, [])

  const requestInstall = useCallback(async () => {
    if (installed || isStandalone()) return
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      setDeferredPrompt(null)
      setShowBanner(false)
      if (outcome === 'accepted') setInstalled(true)
      return
    }
    if (isIos()) {
      setShowIosModal(true)
    }
  }, [deferredPrompt, installed])

  const openIosInstructions = useCallback(() => {
    if (!installed && isIos()) setShowIosModal(true)
  }, [installed])

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      canInstall: !installed && !isStandalone(),
      isInstalled: installed || isStandalone(),
      hasNativePrompt: !!deferredPrompt,
      isIosDevice: isIos(),
      requestInstall,
      openIosInstructions,
    }),
    [deferredPrompt, installed, openIosInstructions, requestInstall]
  )

  return (
    <PwaInstallContext.Provider value={value}>
      {children}

      {!installed && showBanner && deferredPrompt && !dismissed && (
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
                  onClick={() => void requestInstall()}
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
      )}

      {!installed && showIosModal && (
        <div
          role="dialog"
          aria-label="Add to Home Screen"
          className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/50 p-4 sm:items-center"
          onClick={() => setShowIosModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-pink-100 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F6F4F3] text-[#D48BA1]">
                <Share className="h-6 w-6" />
              </div>
              <div>
                <p className="font-black text-slate-900">Add to Home Screen</p>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  In Safari, tap <strong>Share</strong>, then <strong>Add to Home Screen</strong> to
                  install MaternalCare Plus on your iPhone or iPad.
                </p>
              </div>
            </div>
            <Button
              type="button"
              className="mt-6 w-full bg-[#D48BA1] hover:bg-[#c47a90] font-bold"
              onClick={() => setShowIosModal(false)}
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </PwaInstallContext.Provider>
  )
}
