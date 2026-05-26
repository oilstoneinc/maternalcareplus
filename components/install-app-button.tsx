'use client'

import { Download, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePwaInstallOptional } from '@/components/pwa-install-context'
import { cn } from '@/lib/utils'

type InstallAppButtonProps = {
  variant?: 'default' | 'outline' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  showIcon?: boolean
  label?: string
}

export default function InstallAppButton({
  variant = 'outline',
  size = 'sm',
  className,
  showIcon = true,
  label = 'Install app',
}: InstallAppButtonProps) {
  const pwa = usePwaInstallOptional()

  if (!pwa?.canInstall) {
    if (pwa?.isInstalled) {
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700',
            className
          )}
        >
          {showIcon && <Check className="h-3.5 w-3.5" />}
          App installed
        </span>
      )
    }
    return null
  }

  const handleClick = () => {
    if (pwa.hasNativePrompt) {
      void pwa.requestInstall()
    } else if (pwa.isIosDevice) {
      pwa.openIosInstructions()
    } else {
      void pwa.requestInstall()
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn('font-bold', className)}
      onClick={handleClick}
    >
      {showIcon && <Download className="mr-1.5 h-3.5 w-3.5" />}
      {label}
    </Button>
  )
}
