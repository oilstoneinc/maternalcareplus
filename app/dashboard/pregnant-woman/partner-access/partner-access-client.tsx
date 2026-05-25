'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock, ArrowRight, HeartPulse } from 'lucide-react'
import { verifyPartnerAccessCode } from '@/app/actions'
import { toast } from 'sonner'
import Link from 'next/link'

interface PartnerAccessClientProps {
  motherFirstName: string
}

export default function PartnerAccessClient({ motherFirstName }: PartnerAccessClientProps) {
  const [joinCode, setJoinCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (joinCode.length < 6) return
    setIsVerifying(true)
    try {
      const result = await verifyPartnerAccessCode(joinCode)
      if (result.success) {
        toast.success('Access granted')
        window.location.href = '/dashboard/pregnant-woman'
      } else {
        toast.error(result.error || 'Invalid or expired code')
      }
    } catch {
      toast.error('Verification failed')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F4F3] flex flex-col items-center justify-center p-4">
      <div className="flex items-center gap-2 mb-8">
        <HeartPulse className="w-8 h-8 text-[#D48BA1]" />
        <span className="text-xl font-black text-slate-800">MaternalCare Plus</span>
      </div>

      <Card className="max-w-md w-full border-none shadow-2xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Lock className="w-8 h-8 text-[#D48BA1]" />
          </div>
          <CardTitle className="text-2xl font-black text-slate-900">Partner access verification</CardTitle>
          <CardDescription className="text-slate-600 font-medium leading-relaxed">
            You signed in with {motherFirstName}&apos;s account. For security, enter the{' '}
            <strong>6-character code</strong> she generates on her phone under{' '}
            <strong>Support your Partner</strong> before you can open the care dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="6-character code"
              className="text-center text-2xl font-black tracking-[0.4em] h-14 uppercase"
              maxLength={6}
              autoComplete="off"
            />
            <Button
              type="submit"
              disabled={isVerifying || joinCode.length < 6}
              className="w-full h-12 font-bold bg-[#D48BA1] hover:bg-[#c47a90]"
            >
              {isVerifying ? 'Verifying…' : 'Unlock dashboard'}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </form>
          <p className="text-xs text-slate-500 text-center mt-6 leading-relaxed">
            Mothers: generate the code on your usual phone (already signed in), then enter it here or
            give it to your partner. Codes expire in 24 hours.
          </p>
          <p className="text-center mt-4">
            <Link href="/sign-in" className="text-sm font-bold text-slate-500 hover:text-[#D48BA1]">
              Sign out and use a different account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
