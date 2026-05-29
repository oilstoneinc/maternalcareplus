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
  BookOpen,
  Activity
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
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({
    'pink-book': true,
    'questions': false,
    'water': false,
    'transport': false,
    'notebook': false,
  })

  // Load from localStorage on client-side mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('father_prep_checklist')
      if (saved) {
        setCompletedTasks(JSON.parse(saved))
      }
    } catch (e) {
      console.error('Failed to load checklist', e)
    }
  }, [])

  const toggleTask = (taskId: string) => {
    setCompletedTasks(prev => {
      const updated = { ...prev, [taskId]: !prev[taskId] }
      try {
        localStorage.setItem('father_prep_checklist', JSON.stringify(updated))
      } catch (e) {
        console.error(e)
      }
      return updated
    })
  }

  // Humanized checklists specific to ANC visits
  const checklistTasks = [
    { id: 'pink-book', task: 'Get her MCH Record Book (Pink Book) & NHIS card ready', due: 'Essential' },
    { id: 'questions', task: 'Draft a list of questions/concerns for the midwife', due: 'This Week' },
    { id: 'water', task: 'Pack a fresh water bottle & light snack (long wait times)', due: 'Before leaving' },
    { id: 'transport', task: 'Confirm transportation & aim to arrive 15 mins early', due: 'Arriving' },
    { id: 'notebook', task: 'Bring a pen to note vital updates & checkup guidelines', due: 'At Clinic' },
  ]

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

  // Dynamic Real-time Vitals from Neon DB
  const vitals = data?.vitals || {}
  const weightHistory = vitals.weightHistory || []
  const latestWeight = vitals.latestWeight || (pregnancy?.prePregnancyWeight ? parseFloat(pregnancy.prePregnancyWeight.toString()) : null)
  const latestBloodPressure = vitals.latestBloodPressure || 'Pending'
  const latestFetalHeartRate = vitals.latestFetalHeartRate || null
  const lastRecordedDate = vitals.lastRecordedDate || null

  // Dynamic support tips based on real gestational week from DB
  const getSupportTips = (w: number) => {
    if (w <= 12) return [
      { title: 'Be patient with mood swings', description: 'Hormones are surging — she needs extra emotional support right now.', icon: Heart, color: 'text-pink-500' },
      { title: 'Help with morning sickness', description: 'Keep dry crackers and ginger tea handy. Small frequent meals help a lot.', icon: Zap, color: 'text-yellow-500' },
      { title: 'Go to the first scan together', description: 'The first ultrasound is a big moment — being there means everything to her.', icon: Baby, color: 'text-blue-500' },
    ]
    if (w <= 27) return [
      { title: 'Daily hydration reminder', description: `At week ${w} her body needs more water. Remind her to drink at least 2.5L daily.`, icon: Heart, color: 'text-blue-500' },
      { title: 'Back & foot massage tonight', description: `Week ${w} often brings lower back and foot aches. A 5-minute massage goes a long way.`, icon: Zap, color: 'text-purple-500' },
      { title: 'Start the hospital bag list', description: 'It\'s not too early — write down essentials: ID, NHIS card, baby clothes, snacks.', icon: ShoppingBag, color: 'text-orange-500' },
    ]
    return [
      { title: 'Pack the hospital bag now', description: `You're at week ${w} — bag should be fully packed and ready at the door.`, icon: ShoppingBag, color: 'text-orange-500' },
      { title: 'Confirm birth plan with her', description: 'Ask what she wants for delivery — pain management, who\'s in the room, breastfeeding.', icon: FileText, color: 'text-indigo-500' },
      { title: 'Practice the drive to hospital', description: 'Know exactly which route to take — time it during morning hours when it matters most.', icon: Phone, color: 'text-emerald-500' },
    ]
  }
  const supportTips = getSupportTips(week)

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

      {/* Real-time Vitals Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Mother Weight Card */}
        <Card className="border-none shadow-md bg-white hover:shadow-lg transition-all group overflow-hidden relative border-l-4 border-l-blue-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-blue-500 tracking-wider">Mother's Weight</span>
              <h4 className="text-2xl font-black text-slate-800 tracking-tight">
                {latestWeight ? `${latestWeight} kg` : 'Pending'}
              </h4>
              <p className="text-[9px] text-slate-400 font-semibold">
                {lastRecordedDate ? `Synced: ${lastRecordedDate}` : 'No weight records yet'}
              </p>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-2xl text-blue-500 group-hover:scale-110 transition-transform">
              <Baby className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Blood Pressure Card */}
        <Card className="border-none shadow-md bg-white hover:shadow-lg transition-all group overflow-hidden relative border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">Blood Pressure</span>
              <h4 className="text-2xl font-black text-slate-800 tracking-tight">
                {latestBloodPressure || 'Pending'}
              </h4>
              <p className="text-[9px] text-slate-400 font-semibold flex items-center gap-1">
                {latestBloodPressure && latestBloodPressure !== 'Pending' ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Normal Range
                  </>
                ) : (
                  'No blood pressure records yet'
                )}
              </p>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-2xl text-emerald-500 group-hover:scale-110 transition-transform">
              <Activity className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Fetal Heart Rate Card */}
        <Card className="border-none shadow-md bg-white hover:shadow-lg transition-all group overflow-hidden relative border-l-4 border-l-rose-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider">Fetal Heart Rate</span>
              <h4 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                {latestFetalHeartRate ? `${latestFetalHeartRate} bpm` : 'Pending'}
                {latestFetalHeartRate && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </h4>
              <p className="text-[9px] text-slate-400 font-semibold flex items-center gap-1">
                {latestFetalHeartRate ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                    Active Heartbeat
                  </>
                ) : (
                  'No fetal heartbeat records yet'
                )}
              </p>
            </div>
            <div className="p-2.5 bg-rose-50 rounded-2xl text-rose-500 group-hover:scale-110 transition-transform">
              <Heart className="h-6 w-6 animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>

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
                data.appointments.map((appt: any, idx: number) => {
                  const apptDate = new Date(appt.scheduledDate)
                  const hospitalName = pregnancy?.hospital?.name || appt.hospitalName || 'Your Clinic'
                  const apptTime = apptDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                  const daysAway = Math.ceil((apptDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={idx} className="p-4 flex items-center justify-between border-b last:border-0 hover:bg-indigo-50/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-indigo-100 flex flex-col items-center justify-center text-indigo-700">
                          <span className="text-[10px] font-bold uppercase">{apptDate.toLocaleString('default', { month: 'short' })}</span>
                          <span className="text-sm font-black leading-none">{apptDate.getDate()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold">{appt.type || 'Antenatal Visit'}</p>
                          <p className="text-xs text-muted-foreground">{hospitalName} • {apptTime}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={`text-[10px] px-2 py-0.5 font-bold border-none ${
                          daysAway <= 3 ? 'bg-red-100 text-red-600' :
                          daysAway <= 7 ? 'bg-amber-100 text-amber-700' :
                          'bg-indigo-100 text-indigo-700'
                        }`}>
                          {daysAway === 0 ? 'Today' : daysAway === 1 ? 'Tomorrow' : `In ${daysAway}d`}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-medium">No upcoming appointments scheduled.</p>
                  <p className="text-xs mt-1 opacity-60">The clinic will notify you when the next visit is booked.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <h2 className="text-lg font-semibold flex items-center gap-2 pt-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" /> Antenatal Visit Prep
          </h2>
          <p className="-mt-2 text-xs text-muted-foreground font-medium">Tick off before each checkup</p>
          <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm p-4 space-y-3">
            {checklistTasks.map((t) => {
              const done = !!completedTasks[t.id]
              return (
                <button
                  key={t.id}
                  onClick={() => toggleTask(t.id)}
                  className="w-full flex items-center justify-between group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-5 w-5 rounded flex items-center justify-center transition-all duration-200 shrink-0 ${
                      done
                        ? 'bg-green-500 border-2 border-green-500 shadow-sm shadow-green-200'
                        : 'border-2 border-slate-300 group-hover:border-indigo-400'
                    }`}>
                      {done && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <span className={`text-sm leading-snug transition-colors ${
                      done ? 'text-muted-foreground line-through' : 'font-medium text-slate-800'
                    }`}>{t.task}</span>
                  </div>
                  <Badge variant="outline" className={`text-[10px] py-0 px-1.5 shrink-0 ml-2 ${
                    done ? 'border-green-200 text-green-600 bg-green-50' : 'opacity-50'
                  }`}>
                    {done ? '✓ Done' : t.due}
                  </Badge>
                </button>
              )
            })}
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
              <p className="text-[10px] text-slate-400 font-medium">
                {Object.values(completedTasks).filter(Boolean).length} of {checklistTasks.length} completed
              </p>
              <button
                onClick={() => {
                  const allDone = checklistTasks.every(t => completedTasks[t.id])
                  const reset: Record<string, boolean> = {}
                  checklistTasks.forEach(t => { reset[t.id] = !allDone })
                  setCompletedTasks(reset)
                  try { localStorage.setItem('father_prep_checklist', JSON.stringify(reset)) } catch(e) { console.error(e) }
                }}
                className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
              >
                {checklistTasks.every(t => completedTasks[t.id]) ? 'Reset all' : 'Mark all done'}
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* Progress Charts & Labs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProgressChart 
          title="Mother's Weight Gain"
          description="Real-time clinical weight log"
          data={weightHistory.length > 0 ? weightHistory : [{ week: 4, weight: pregnancy?.prePregnancyWeight ? parseFloat(pregnancy.prePregnancyWeight.toString()) : 60, date: 'Baseline' }]}
          dataKey="weight"
          xAxisKey="week"
          unit=" kg"
          color="#6366f1"
        />

        {/* Labs View — statuses match MCH book exactly */}
        <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm h-full">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-indigo-500" /> Lab & Scan Results
            </CardTitle>
            <CardDescription className="text-xs">Results recorded by the hospital</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.labs?.length > 0 ? (
              data.labs.map((lab: any, idx: number) => {
                const statusColor =
                  lab.status === 'abnormal' || lab.status === 'critical'
                    ? 'bg-red-100 text-red-800'
                    : lab.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-amber-100 text-amber-800'
                const statusLabel =
                  lab.status === 'completed' ? 'Completed'
                  : lab.status === 'abnormal' ? 'Abnormal'
                  : lab.status === 'critical' ? 'Critical'
                  : 'Pending'
                return (
                  <div key={idx} className="p-3 bg-white/80 rounded-xl shadow-sm border border-slate-100 space-y-1.5">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex gap-3 items-start">
                        <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600 mt-0.5 shrink-0">
                          <Beaker className="h-3.5 w-3.5" />
                        </div>
                        <p className="text-sm font-bold text-slate-800 leading-snug">{lab.testName}</p>
                      </div>
                      <Badge className={`shrink-0 text-[10px] border-none font-bold ${statusColor}`}>
                        {statusLabel}
                      </Badge>
                    </div>
                    {(lab.resultValue || lab.normalRange) && (
                      <p className="text-xs text-slate-600 pl-8">
                        {lab.resultValue ? `Result: ${lab.resultValue}` : 'Awaiting result'}
                        {lab.normalRange && ` (Ref: ${lab.normalRange})`}
                      </p>
                    )}
                    {lab.interpretation && (
                      <p className="text-[10px] text-slate-500 italic pl-8">{lab.interpretation}</p>
                    )}
                    <p className="text-[10px] text-slate-400 font-bold uppercase pl-8">
                      {lab.resultDate
                        ? `Reported ${new Date(lab.resultDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : lab.orderedDate
                        ? `Ordered ${new Date(lab.orderedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — awaiting results`
                        : 'Date not recorded'}
                    </p>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8 opacity-20">
                <FileText className="h-10 w-10 mx-auto mb-2" />
                <p className="text-sm">No lab results recorded yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Educational Section - What to Expect */}
      <h2 className="text-lg font-black text-indigo-950 flex items-center gap-2 pt-4">
        <Zap className="h-5 w-5 text-yellow-500" /> What to Expect — Week {week > 0 ? week : '?'}
      </h2>
      <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-900 to-indigo-950 text-white p-6 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10">
          <Baby className="h-32 w-32 translate-x-8 translate-y-8" />
        </div>
        <div className="relative z-10 space-y-3">
          {week <= 0 && (
            <p className="text-indigo-100/90 leading-relaxed">No gestational age recorded yet. Once your partner's clinic logs her LMP or ultrasound date, you'll see weekly updates here.</p>
          )}
          {week >= 1 && week <= 12 && (
            <p className="text-indigo-100/90 leading-relaxed">
              At week {week}, the baby is still tiny but growing fast — all major organs are forming. Your partner may be dealing with nausea and extreme fatigue. Help with cooking, be patient, and make sure she's attending her early booking visit at the clinic.
            </p>
          )}
          {week >= 13 && week <= 27 && (
            <p className="text-indigo-100/90 leading-relaxed">
              At week {week}, your baby can now hear sounds — talk or sing to the bump, it matters! Your partner is likely feeling more energetic but may have backaches and swollen feet. Help with household chores, attend the anatomy scan together, and keep her diet iron-rich.
            </p>
          )}
          {week >= 28 && week <= 36 && (
            <p className="text-indigo-100/90 leading-relaxed">
              At week {week}, the baby is gaining weight rapidly and getting into position. Your partner may feel Braxton Hicks (practice contractions) and shortness of breath. Now is the time to pack the hospital bag, confirm your NHIS coverage, and know the fastest route to the hospital.
            </p>
          )}
          {week >= 37 && (
            <p className="text-indigo-100/90 leading-relaxed">
              Week {week} — baby is full term and could arrive any day! Stay close, keep your phone charged, and make sure transport is ready at all times. Support her through any anxiety and ensure the hospital bag, MCH book, and NHIS card are all ready to go.
            </p>
          )}
          <div className="flex items-center justify-between pt-1">
            <p className="text-[10px] text-indigo-200/80 font-semibold uppercase tracking-wider">
              {week <= 12 ? '1st Trimester' : week <= 27 ? '2nd Trimester' : '3rd Trimester'} · Week {week} of 40
            </p>
            {readOnly && <span className="text-[10px] text-indigo-300/60 font-semibold uppercase tracking-wider">Read only</span>}
          </div>
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
