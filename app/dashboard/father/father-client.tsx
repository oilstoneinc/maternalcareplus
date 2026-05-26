'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Heart, 
  Calendar, 
  Info, 
  AlertCircle, 
  CheckCircle2, 
  Baby, 
  Phone, 
  ShoppingBag,
  Clock,
  ChevronRight,
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
  Eye,
  FileText,
  FlaskConical,
  Beaker,
  BookOpen
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { linkFatherViaToken } from '@/app/actions'
import ProgressChart from '@/components/dashboard/ProgressChart'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import InstallAppFooter from '@/components/install-app-footer'

interface FatherDashboardProps {
  user: any
  data: any
}

export default function FatherDashboardClient({ user, data }: FatherDashboardProps) {
  const readOnly = !!data?.readOnly
  const [joinCode, setJoinCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (joinCode.length < 6) return

    setIsJoining(true)
    try {
      const result = await linkFatherViaToken(joinCode)
      if (result.success) {
        toast.success('Access granted — welcome to your partner dashboard')
        window.location.href = '/dashboard/father'
      } else {
        toast.error(result.error || 'Failed to verify code')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setIsJoining(false)
    }
  }

  if (!data?.pregnancy) {
    const awaitingCode = !!data?.pendingVerification

    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-none shadow-2xl bg-white/80 backdrop-blur-xl">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Lock className="w-10 h-10 text-indigo-600" />
            </div>
            <CardTitle className="text-2xl font-black text-indigo-950">Welcome, Dad!</CardTitle>
            <CardDescription className="text-indigo-700/60 font-medium">
              {awaitingCode
                ? 'Your account is registered. Enter the security code your partner shares with you to view her pregnancy records.'
                : 'Sign in with the email the hospital used for your partner invitation. If you have not been invited, ask the clinic to add your email.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {awaitingCode ? (
              <form onSubmit={handleJoin} className="space-y-6">
                <div className="space-y-2">
                  <Input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Partner code"
                    className="text-center text-2xl font-black tracking-[0.5em] h-16 border-2 border-indigo-100 focus:border-indigo-600 focus:ring-indigo-600 rounded-2xl uppercase placeholder:tracking-normal placeholder:font-medium placeholder:text-lg"
                    maxLength={6}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isJoining || joinCode.length < 6}
                  className="w-full h-16 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 rounded-2xl group"
                >
                  {isJoining ? 'Verifying...' : 'Unlock Partner Access'}
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <p className="text-[10px] text-center text-muted-foreground">
                  Codes expire in 24 hours. Ask your partner to generate a new one from her dashboard if needed.
                </p>
              </form>
            ) : (
              <p className="text-center text-sm text-indigo-800/80">
                After you accept the hospital invitation email, return here. Your partner will send you a code to unlock read-only access.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const pregnancy = data?.pregnancy
  const week = pregnancy?.gestationalAge ?? 0
  const progressValue = Math.min((week / 40) * 100, 100)
  const edd = pregnancy?.edd ? new Date(pregnancy.edd).toLocaleDateString() : 'Pending'
  const clinicRecs: { title: string; content: string; date?: string }[] =
    data?.clinicRecommendations || []

  // Weight tracking mock data
  const weightData = [
    { week: 4, weight: 62 },
    { week: 8, weight: 62.5 },
    { week: 12, weight: 63.8 },
    { week: 16, weight: 65.2 },
    { week: 20, weight: 67.1 },
    { week: 24, weight: 68.5 },
  ]

  const supportTips = [
    { title: 'Hydration Check', description: 'Remind her to drink water. She needs about 2.5L daily.', icon: Heart, color: 'text-blue-500' },
    { title: 'Back Massage', description: 'Week 24 often brings backaches. A 5-min rub helps!', icon: Zap, color: 'text-purple-500' },
    { title: 'Hospital Bag', description: 'Its early, but start a list of essentials.', icon: ShoppingBag, color: 'text-orange-500' },
  ]

  const upcomingTasks = [
    { task: 'Install Car Seat', status: 'pending', due: 'In 4 weeks' },
    { task: 'Verify Insurance Coverage', status: 'completed', due: 'Done' },
    { task: 'Book Prenatal Class', status: 'pending', due: 'Next week' },
  ]

  return (
    <div className="p-4 space-y-6 max-w-5xl mx-auto pb-20">
      {readOnly && (
        <div className="flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-900">
          <Eye className="h-4 w-4 shrink-0" />
          Read-only partner view — you can see progress and clinic updates but cannot edit records or message care teams.
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {readOnly ? 'Partner Dashboard' : 'Dad\'s Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {readOnly ? 'View-only support for your partner\'s pregnancy journey.' : 'Support, track, and prepare for baby.'}
          </p>
        </div>
        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-white shadow-sm">
          {readOnly ? <Eye className="h-5 w-5 text-indigo-600" /> : <ShieldCheck className="h-5 w-5 text-indigo-600" />}
        </div>
      </header>

      {readOnly && (
        <Card className="border-none shadow-md ring-1 ring-indigo-100">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Digital MCH Record Book</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  View the same national MCH chapters — appointments, vitals, delivery, and child records (read only).
                </p>
              </div>
            </div>
            <Button asChild className="bg-indigo-600 hover:bg-indigo-700 font-bold shrink-0">
              <Link href="/dashboard/father/mch-book">Open MCH Book</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pregnancy Progress Card */}
      <Card className="border-none bg-gradient-to-br from-indigo-500 to-purple-600 text-white overflow-hidden shadow-xl relative">
        <div className="absolute -right-8 -top-8 opacity-10">
          <Baby className="h-40 w-40" />
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-indigo-50">
            Current Progress
          </CardTitle>
          <CardDescription className="text-indigo-100/80">Week {week} of 40</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium text-white/90">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Journey Progress</span>
              <span className="font-black">{Math.round(progressValue)}%</span>
            </div>
            <Progress value={progressValue} className="h-3 bg-white/20" />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-200" />
              <span className="text-sm">Due Date: <span className="font-bold">{edd}</span></span>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-none">
              Second Trimester
            </Badge>
          </div>
        </CardContent>
      </Card>

      {clinicRecs.length > 0 && (
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Clinic guidance for your partner</CardTitle>
            <CardDescription>Posted by {pregnancy?.hospital?.name || 'her hospital'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {clinicRecs.map((rec, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <p className="font-bold text-sm text-slate-900">{rec.title}</p>
                {rec.date && <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{rec.date}</p>}
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{rec.content}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Support Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" /> How to Support Today
          </h2>
          {supportTips.map((tip, idx) => (
            <Card key={idx} className="border-none shadow-md bg-white/50 backdrop-blur-sm hover:bg-white/80 transition-colors cursor-pointer group">
              <CardContent className="p-4 flex items-start gap-4">
                <div className={`p-2 rounded-xl bg-white shadow-sm group-hover:scale-110 transition-transform`}>
                  <tip.icon className={`h-5 w-5 ${tip.color}`} />
                </div>
                <div>
                  <h4 className="font-bold text-sm">{tip.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{tip.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Checkup & Tasks */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-500" /> Upcoming Checkups
          </h2>
          <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-0">
              {data?.appointments?.length > 0 ? (
                data.appointments.map((appt: any, idx: number) => (
                  <div key={idx} className="p-4 flex items-center justify-between border-b last:border-0 hover:bg-indigo-50/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-indigo-100 flex flex-col items-center justify-center text-indigo-700">
                        <span className="text-[10px] font-bold uppercase">{new Date(appt.scheduledDate).toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-sm font-black leading-none">{new Date(appt.scheduledDate).getDate()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold">{appt.type || 'Prenatal Checkup'}</p>
                        <p className="text-xs text-muted-foreground">Hospital General • 10:00 AM</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No upcoming appointments scheduled.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <h2 className="text-lg font-semibold flex items-center gap-2 pt-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" /> Prep Checklist
          </h2>
          <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm p-4 space-y-3">
            {upcomingTasks.map((t, idx) => (
              <div key={idx} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${t.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-muted-foreground/30'}`}>
                    {t.status === 'completed' && <CheckCircle2 className="h-3 w-3 text-white" />}
                  </div>
                  <span className={`text-sm ${t.status === 'completed' ? 'text-muted-foreground line-through' : 'font-medium'}`}>{t.task}</span>
                </div>
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 opacity-50">{t.due}</Badge>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Progress Charts & Labs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProgressChart 
          title="Weight Gain Progress"
          description="Monitoring healthy growth"
          data={weightData}
          dataKey="weight"
          xAxisKey="week"
          unit=" kg"
          color="#6366f1"
        />

        {/* Labs View */}
        <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm h-full">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-indigo-500" /> Medical Checks
            </CardTitle>
            <CardDescription className="text-xs">Results shared by your partner</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.labs?.length > 0 ? (
              data.labs.map((lab: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-white/80 rounded-xl shadow-sm border border-indigo-50">
                  <div className="flex gap-3 items-center">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                      <Beaker className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{lab.testName}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(lab.resultDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-none text-[10px]">Clear</Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-8 opacity-20">
                <FileText className="h-10 w-10 mx-auto mb-2" />
                <p className="text-sm">No recent tests</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Educational Section - What to Expect */}
      <h2 className="text-lg font-black text-indigo-950 flex items-center gap-2 pt-4">
        <Zap className="h-5 w-5 text-yellow-500" /> What to Expect this Week
      </h2>
      <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-900 to-indigo-950 text-white p-6 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10">
          <Info className="h-32 w-32 translate-x-8 translate-y-8" />
        </div>
        <div className="relative z-10 space-y-4">
          <p className="text-indigo-100/90 leading-relaxed">
            At week {week}, your baby is starting to grow real hair and their lungs are developing fast! Your partner might be feeling more "practice" contractions. Keep her hydration high and try to handle more of the household errands this week.
          </p>
          <p className="text-[10px] text-indigo-200/80 font-semibold uppercase tracking-wider">
            {readOnly ? 'Educational summary — read only' : 'Educational summary'}
          </p>
        </div>
      </Card>

      {/* Emergency Quick Access */}
      <div className="flex gap-4">
        <button className="flex-1 bg-red-50 text-red-600 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold hover:bg-red-100 transition-colors shadow-sm">
          <Phone className="h-5 w-5" /> Emergency Call
        </button>
        <button className="flex-1 bg-indigo-50 text-indigo-600 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold hover:bg-indigo-100 transition-colors shadow-sm">
          <Info className="h-5 w-5" /> Help Guide
        </button>
      </div>

      <footer className="rounded-2xl border border-indigo-100 bg-white/80 px-6 py-4 shadow-sm">
        <InstallAppFooter />
      </footer>
    </div>
  )
}
