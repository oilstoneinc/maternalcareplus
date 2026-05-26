'use client'

import { useState, useEffect } from 'react'
import { User } from '@clerk/nextjs/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { 
  Calendar, 
  Baby, 
  Heart, 
  BookOpen, 
  MessageCircle, 
  TrendingUp, 
  Phone,
  Clock,
  ChevronRight,
  Bell,
  Activity,
  FileText,
  UserPlus,
  Copy,
  Check,
  Moon,
  AlertCircle,
  Building2,
} from 'lucide-react'
import HospitalCareHistoryPanel from '@/components/dashboard/HospitalCareHistoryPanel'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import ProgressChart from '@/components/dashboard/ProgressChart'
import type { DashboardData } from '@/types'
import { generateFatherJoinCode, markNotificationsRead } from '@/app/actions'
import NearestHospitalsDialog from '@/components/dashboard/NearestHospitalsDialog'
import InstallAppFooter from '@/components/install-app-footer'
import { pusherClient } from '@/lib/pusher-client'
import { useRouter } from 'next/navigation'
import { Sparkles as SparklesIcon } from 'lucide-react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'

export default function PregnantWomanClient({ user, data }: { user: any, data: DashboardData | null }) {
  // Calculate real gestational age from LMP
  const lmp = data?.pregnancy?.lmp ? new Date(data.pregnancy.lmp) : null
  const edd = data?.pregnancy?.edd ? new Date(data.pregnancy.edd) : null
  const now = new Date()
  
  let gestationalAge = 0
  let progress = 0
  let daysToEdd = 0

  if (lmp) {
    const diffTime = now.getTime() - lmp.getTime()
    const weeksFromLmp = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7)))
    gestationalAge =
      data?.pregnancy?.gestationalAge != null && data.pregnancy.gestationalAge > 0
        ? data.pregnancy.gestationalAge
        : weeksFromLmp
    progress = Math.min((gestationalAge / 40) * 100, 100)
  }

  if (edd) {
    const diffDays = Math.ceil((edd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    daysToEdd = Math.max(diffDays, 0)
  }

  const babySizeByWeek = (week: number): string => {
    if (week < 4) return 'poppy seed'
    if (week < 6) return 'pea'
    if (week < 8) return 'raspberry'
    if (week < 12) return 'plum'
    if (week < 16) return 'avocado'
    if (week < 20) return 'banana'
    if (week < 24) return 'ear of corn'
    if (week < 28) return 'eggplant'
    return 'cantaloupe'
  }

  const formatVitalDate = (d: string | Date) =>
    new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  // Vitals from clinic — chart by visit date
  const weightData = (data?.vitals || [])
    .filter((v) => v.weight != null && v.weight !== '')
    .map((v) => ({
      label: formatVitalDate(v.recordedDate),
      weight: parseFloat(String(v.weight)),
    }))
    .reverse()

  const bpData = (data?.vitals || [])
    .filter((v) => v.bloodPressureSystolic && v.bloodPressureDiastolic)
    .map((v) => ({
      label: formatVitalDate(v.recordedDate),
      systolic: v.bloodPressureSystolic,
      diastolic: v.bloodPressureDiastolic,
    }))
    .reverse()

  const heartRateData = (data?.vitals || [])
    .filter((v) => v.heartRate != null)
    .map((v) => ({
      label: formatVitalDate(v.recordedDate),
      fhr: v.heartRate,
    }))
    .reverse()

  const [shareCode, setShareCode] = useState<string | null>(
    data?.pregnancy?.fatherJoinCode || null
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [realtimeNotification, setRealtimeNotification] = useState<string | null>(null)
  const [notificationList, setNotificationList] = useState<any[]>(data?.notifications || [])
  const router = useRouter()

  const hospitalPhone = data?.pregnancy?.hospital?.phone as string | undefined
  const registeredHospitalId = data?.pregnancy?.hospitalId as string | undefined

  const formatTel = (phone?: string) => {
    if (!phone) return null
    const digits = phone.replace(/[^\d+]/g, '')
    return digits ? `tel:${digits}` : null
  }

  const unreadCount = notificationList.filter((n) => !n.isRead).length

  useEffect(() => {
    if (data?.notifications) {
      setNotificationList(data.notifications)
    }
  }, [data?.notifications])

  useEffect(() => {
    if (!data?.user?.id) return
    if (!process.env.NEXT_PUBLIC_PUSHER_APP_KEY || process.env.NEXT_PUBLIC_PUSHER_APP_KEY === 'dummy_key') {
      return
    }

    const pregnancyId = data?.pregnancy?.id
    const userChannel = `user-${data.user.id}`
    const userCh = pusherClient.subscribe(userChannel)

    const onDbNotification = (payload: {
      id?: string
      title?: string
      message?: string
      type?: string
      createdAt?: string
      isRead?: boolean
    }) => {
      const entry = {
        id: payload.id || `live-${Date.now()}`,
        title: payload.title || 'Clinic update',
        message: payload.message || 'Your records were updated.',
        type: payload.type || 'clinical_update',
        createdAt: payload.createdAt || new Date().toISOString(),
        isRead: false,
      }
      setNotificationList((prev) => [entry, ...prev.filter((n) => n.id !== entry.id)])
      setRealtimeNotification(entry.message)
      router.refresh()
      setTimeout(() => setRealtimeNotification(null), 10000)
    }

    userCh.bind('notification', onDbNotification)

    let pregnancyCh: ReturnType<typeof pusherClient.subscribe> | null = null
    const onPregnancyUpdate = (payload: { message?: string }) => {
      setRealtimeNotification(payload.message || 'Your health records were updated by your clinic.')
      router.refresh()
      setTimeout(() => setRealtimeNotification(null), 10000)
    }

    if (pregnancyId) {
      pregnancyCh = pusherClient.subscribe(`pregnancy-${pregnancyId}`)
      pregnancyCh.bind('mch-update', onPregnancyUpdate)
      pregnancyCh.bind('vitals-update', onPregnancyUpdate)
      pregnancyCh.bind('labs-update', onPregnancyUpdate)
    }

    return () => {
      userCh.unbind('notification', onDbNotification)
      pusherClient.unsubscribe(userChannel)
      if (pregnancyCh && pregnancyId) {
        pregnancyCh.unbind('mch-update', onPregnancyUpdate)
        pregnancyCh.unbind('vitals-update', onPregnancyUpdate)
        pregnancyCh.unbind('labs-update', onPregnancyUpdate)
        pusherClient.unsubscribe(`pregnancy-${pregnancyId}`)
      }
    }
  }, [data?.pregnancy?.id, data?.user?.id, router])

  const handleGenerateCode = async () => {
    if (!data?.pregnancy?.id) return
    setIsGenerating(true)
    try {
      const result = await generateFatherJoinCode(data.pregnancy.id)
      if (result.success) {
        setShareCode(result.code!)
      }
    } catch (error) {
      console.error('Error generating code:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = () => {
    if (shareCode) {
      navigator.clipboard.writeText(shareCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleOpenNotifications = async () => {
    await markNotificationsRead()
    setNotificationList((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-8 w-full min-w-0">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sweet Greetings, {user?.firstName}</h1>
            <p className="text-gray-600">You're making wonderful progress on your journey.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
            <Button asChild variant="outline" className="rounded-full shadow-sm bg-white border-muted w-full sm:w-auto">
              <Link href="/dashboard/pregnant-woman/digital-mch-book">
                <BookOpen className="w-4 h-4 mr-2" />
                MCH Book
              </Link>
            </Button>
            
            <Dialog onOpenChange={(open) => open && handleOpenNotifications()}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-full shadow-sm bg-white border-muted w-full sm:w-auto relative">
                  <Bell className="w-4 h-4 mr-2" />
                  Notifications
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D48BA1] text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Notifications</DialogTitle>
                  <DialogDescription>Updates from your hospital and care team</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2 overflow-y-auto flex-1 min-h-0">
                  {notificationList.length > 0 ? (
                    notificationList.map((n) => (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border ${
                          n.isRead
                            ? 'bg-slate-50 border-slate-100'
                            : 'bg-emerald-50 border-emerald-100'
                        }`}
                      >
                        <div className={`p-2 rounded-full text-white mt-0.5 shrink-0 ${n.isRead ? 'bg-slate-400' : 'bg-emerald-500'}`}>
                          <SparklesIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-slate-900">{n.title}</p>
                          <p className="text-sm text-slate-600 mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">
                            {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No notifications yet</p>
                      <p className="text-xs mt-1">You will be alerted when your clinic updates your records.</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {data?.pregnancy?.midwifeId ? (
              <Button asChild className="btn-pink rounded-full shadow-md w-full sm:w-auto">
                <Link href={`/dashboard/chat?with=${data.pregnancy.midwifeId}`}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message {data?.careContact ? `${data.careContact.firstName}` : 'Care Team'}
                </Link>
              </Button>
            ) : (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="btn-pink rounded-full shadow-md w-full sm:w-auto">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Message Care Team
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-rose-600">
                      <AlertCircle className="w-5 h-5" />
                      No care contact assigned
                    </DialogTitle>
                    <DialogDescription className="pt-2">
                      Your hospital has not yet assigned a nurse or midwife for messaging. Please contact your clinic or wait until staff is assigned.
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </header>

        {realtimeNotification && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 shadow-sm flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-emerald-500 p-2.5 rounded-2xl text-white">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-black text-slate-800 text-sm tracking-tight">Record Update Alert</h4>
              <p className="text-slate-600 text-xs font-semibold mt-0.5">{realtimeNotification}</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-full bg-white text-xs border-emerald-200 hover:bg-emerald-100/50" onClick={() => window.location.reload()}>
              View Changes
            </Button>
          </div>
        )}

        {/* Hero Progress Section */}
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md overflow-hidden ring-1 ring-black/5">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Baby className="w-48 h-48 text-secondary" />
          </div>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="flex flex-col justify-center">
                <span className="text-sm font-medium text-secondary mb-1 uppercase tracking-wider">Current Progress</span>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-5xl font-bold text-gray-900">Week {gestationalAge}</h2>
                  <span className="text-muted-foreground font-medium">/ 40</span>
                </div>
                <Progress value={progress} className="h-3 mt-4 bg-pink-50" />
                <p className="text-sm text-gray-500 mt-2">Approximately {Math.floor(gestationalAge / 4)} months along</p>
              </div>

              <div className="flex flex-col justify-center border-l-0 md:border-l border-muted pl-0 md:pl-8 mt-6 md:mt-0">
                <span className="text-sm font-medium text-primary mb-1 uppercase tracking-wider">Countdown to EDD</span>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-4xl font-bold text-gray-900">{daysToEdd > 0 ? daysToEdd : 0}</h2>
                  <span className="text-gray-500 font-medium">Days left</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Estimated Date: {edd ? edd.toLocaleDateString() : 'Pending calculation'}</p>
              </div>

              <div className="flex flex-col justify-center border-l-0 lg:border-l border-muted pl-0 lg:pl-8 lg:col-span-2 mt-6 lg:mt-0">
                <div className="bg-primary/5 rounded-2xl p-6 flex items-center gap-4 ring-1 ring-primary/10">
                  <div className="bg-primary p-3 rounded-xl shadow-lg shadow-primary/20">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-primary">Your Baby's Growth</h4>
                    <p className="text-sm text-primary/80">
                      At week {gestationalAge}, your baby is about the size of a {babySizeByWeek(gestationalAge)}!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8 min-w-0">
            
            {/* Health Metrics & Charts */}
            <Card className="border-none shadow-lg overflow-hidden min-w-0">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pb-2">
                <div className="min-w-0">
                  <CardTitle className="text-xl">Health Tracking</CardTitle>
                  <CardDescription className="text-sm">
                    Vitals recorded by your clinic at each visit
                  </CardDescription>
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0 w-full sm:w-auto rounded-xl border-slate-200">
                  <Link href="/dashboard/pregnant-woman/digital-mch-book">
                    <BookOpen className="w-4 h-4 mr-1.5" />
                    View full records
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="min-w-0 pt-0">
                <Tabs defaultValue="weight" className="w-full min-w-0">
                  <TabsList className="mb-4 w-full h-auto p-1 grid grid-cols-3 gap-1 bg-slate-100/80">
                    <TabsTrigger
                      value="weight"
                      className="text-[11px] sm:text-xs px-1 sm:px-2 py-2 leading-tight whitespace-normal text-center data-[state=active]:shadow-sm"
                    >
                      Weight
                    </TabsTrigger>
                    <TabsTrigger
                      value="bp"
                      className="text-[11px] sm:text-xs px-1 sm:px-2 py-2 leading-tight whitespace-normal text-center data-[state=active]:shadow-sm"
                    >
                      Blood pressure
                    </TabsTrigger>
                    <TabsTrigger
                      value="heart"
                      className="text-[11px] sm:text-xs px-1 sm:px-2 py-2 leading-tight whitespace-normal text-center data-[state=active]:shadow-sm"
                    >
                      Fetal heart rate
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="weight" className="mt-0 min-w-0 focus-visible:outline-none">
                    <ProgressChart
                      embedded
                      title="Weight tracking"
                      description="Recorded at clinic visits (kg)"
                      data={weightData}
                      dataKey="weight"
                      xAxisKey="label"
                      xAxisLabel="Visit date"
                      unit=" kg"
                      color="hsl(330, 81%, 60%)"
                    />
                  </TabsContent>

                  <TabsContent value="bp" className="mt-0 min-w-0 focus-visible:outline-none">
                    {bpData.length > 0 ? (
                      <div className="min-w-0 w-full h-[220px] sm:h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={bpData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                              dataKey="label"
                              tick={{ fontSize: 10 }}
                              interval="preserveStartEnd"
                              tickMargin={8}
                            />
                            <YAxis width={36} tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="systolic" stroke="#ef4444" name="Systolic" strokeWidth={2} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="diastolic" stroke="#3b82f6" name="Diastolic" strokeWidth={2} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[220px] flex items-center justify-center text-gray-500 bg-slate-50 rounded-xl border border-slate-100 px-4">
                        <div className="text-center">
                          <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">Blood pressure will appear after your clinic records a visit.</p>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="heart" className="mt-0 min-w-0 focus-visible:outline-none">
                    {heartRateData.length > 0 ? (
                      <div className="min-w-0 w-full h-[220px] sm:h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={heartRateData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                              dataKey="label"
                              tick={{ fontSize: 10 }}
                              interval="preserveStartEnd"
                              tickMargin={8}
                            />
                            <YAxis width={36} domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Line
                              type="monotone"
                              dataKey="fhr"
                              stroke="#ec4899"
                              name="bpm"
                              strokeWidth={2}
                              dot={{ r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[220px] flex items-center justify-center text-gray-500 bg-slate-50 rounded-xl border border-slate-100 px-4">
                        <div className="text-center">
                          <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">Fetal heart rate will appear when recorded at a visit.</p>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* National care across hospitals */}
            {(data?.careHistory?.length ?? 0) > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Building2 className="w-5 h-5 text-[#D48BA1]" />
                  <h3 className="text-xl font-bold text-foreground">Your care across hospitals</h3>
                </div>
                <p className="text-xs text-slate-500 px-1 leading-relaxed">
                  When you visit another facility, they can update your national MCH record. You receive a
                  notification each time — your home clinic sees the same history.
                </p>
                <HospitalCareHistoryPanel
                  history={data!.careHistory!}
                  facilitySummary={data?.careFacilitySummary}
                  homeHospitalName={data?.pregnancy?.hospital?.name}
                  compact
                />
              </div>
            )}

            {/* Clinic recommendations */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-xl font-bold text-foreground">Recommended for You</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  From your hospital
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(data?.clinicRecommendations?.length ?? 0) > 0 ? (
                  data!.clinicRecommendations!.map((item, i) => {
                    const icon =
                      item.source === 'medication'
                        ? { Icon: Activity, color: 'bg-blue-50 text-blue-600' }
                        : item.source === 'clinic_visit'
                          ? { Icon: Heart, color: 'bg-pink-50 text-pink-600' }
                          : { Icon: FileText, color: 'bg-emerald-50 text-emerald-600' }
                    return (
                      <Dialog key={`${item.title}-${i}`}>
                        <DialogTrigger asChild>
                          <Card className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                            <CardContent className="p-4 flex items-center gap-4">
                              <div className={`p-3 rounded-xl ${icon.color}`}>
                                <icon.Icon className="w-5 h-5" />
                              </div>
                              <div className="flex-1 text-left min-w-0">
                                <h4 className="font-semibold text-gray-900 truncate">{item.title}</h4>
                                <p className="text-xs text-gray-500 truncate">
                                  {item.date ? `${item.date} · ` : ''}
                                  {item.source === 'medication'
                                    ? 'Prescribed medications'
                                    : item.source === 'standing_advice'
                                      ? 'Care team advice'
                                      : 'After clinic visit'}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-secondary transition-colors shrink-0" />
                            </CardContent>
                          </Card>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{item.title}</DialogTitle>
                            <DialogDescription className="text-base text-gray-700 pt-4 leading-relaxed whitespace-pre-wrap">
                              {item.content}
                            </DialogDescription>
                          </DialogHeader>
                        </DialogContent>
                      </Dialog>
                    )
                  })
                ) : (
                  <Card className="border-none shadow-sm md:col-span-2">
                    <CardContent className="p-6 text-center text-sm text-slate-500">
                      Your clinic has not posted personalized recommendations yet. They can add advice
                      after a visit or from your patient profile in the hospital portal.
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar Area */}
          <div className="space-y-8">
            
            {/* Partner (hospital invite) */}
            <Card className="border-none shadow-lg bg-primary/5 overflow-hidden relative group ring-1 ring-primary/10">
              <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform">
                <UserPlus className="w-24 h-24 text-primary" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                  <UserPlus className="w-4 h-4" />
                  Support your Partner
                </CardTitle>
                <CardDescription className="text-indigo-700/70 text-[10px]">
                  {data?.linkedPartner
                    ? data.linkedPartner.accessActive
                      ? 'Partner has verified access to your records'
                      : 'After your partner registers, share a code so only they can view your records'
                    : 'Ask your hospital to add partner email when registering you'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                {data?.linkedPartner ? (
                  <>
                    <div className="bg-white p-3 rounded-xl border border-indigo-100 text-xs space-y-1">
                      <p className="font-bold text-indigo-900">
                        {data.linkedPartner.firstName} {data.linkedPartner.lastName}
                      </p>
                      <p className="text-indigo-700/80">{data.linkedPartner.email}</p>
                      <p className="text-[10px] text-slate-500 pt-1">
                        {data.linkedPartner.accessActive
                          ? 'Read-only access is active.'
                          : 'They sign in with this email, then you send them the code below.'}
                      </p>
                    </div>
                    {!data.linkedPartner.accessActive && (
                      <>
                        {shareCode ? (
                          <div className="space-y-3">
                            <div className="bg-white p-3 rounded-xl border border-indigo-100 flex items-center justify-between shadow-sm">
                              <span className="font-mono text-lg font-black tracking-widest text-indigo-600">
                                {shareCode}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={copyToClipboard}
                                className="h-8 w-8 text-indigo-400 hover:text-indigo-600"
                              >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full text-[10px] border-indigo-200 text-indigo-600 hover:bg-white"
                              onClick={handleGenerateCode}
                              disabled={isGenerating}
                            >
                              {isGenerating ? 'Generating...' : 'Generate new code'}
                            </Button>
                            <p className="text-[10px] text-center text-muted-foreground">
                              Expires in 24 hours
                            </p>
                          </div>
                        ) : (
                          <Button
                            className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-md"
                            onClick={handleGenerateCode}
                            disabled={isGenerating}
                          >
                            {isGenerating ? 'Generating...' : 'Generate partner code'}
                          </Button>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <p className="text-[10px] text-indigo-800/80 font-medium">
                    Partner gets a separate invite email, then you share a code to unlock their read-only view.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Appointments */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-secondary" />
                  Upcoming Visits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {(data?.appointments?.length ?? 0) > 0 ? (
                  data?.appointments.map((apt, i) => (
                    <div key={apt.id || i} className="flex gap-4 relative">
                      {i < (data?.appointments?.length ?? 0) - 1 && (
                        <div className="absolute left-6 top-10 bottom-0 w-[2px] bg-gray-100" />
                      )}
                      <div className="bg-secondary/10 text-secondary p-3 h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">
                          {new Date(apt.scheduledDate).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="text-sm font-medium text-secondary mt-2">
                          {apt.notes || 'Antenatal clinic visit'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {data?.pregnancy?.hospital?.name || 'Your registered hospital'}
                        </p>
                        <Badge variant="outline" className="mt-2 text-[10px] capitalize">
                          {apt.status || 'scheduled'}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="bg-secondary/5 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Calendar className="text-secondary" />
                    </div>
                    <p className="text-sm text-gray-500">No scheduled appointments</p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="mt-4">Book Now</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Book an Appointment</DialogTitle>
                          <DialogDescription className="pt-2">
                            To schedule your next antenatal visit, please contact your assigned midwife directly through the messaging portal, or review your schedule in your MCH book.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex gap-3 mt-4">
                          <Button asChild variant="outline" className="flex-1 w-full">
                            <Link href="/dashboard/pregnant-woman/digital-mch-book">
                              View MCH Book
                            </Link>
                          </Button>
                          {data?.pregnancy?.midwifeId ? (
                            <Button asChild className="flex-1 w-full btn-pink">
                              <Link href={`/dashboard/chat?with=${data.pregnancy.midwifeId}`}>
                                Message Midwife
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-none shadow-lg bg-secondary text-white ring-1 ring-secondary/20">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-4">Emergency Support</h3>
                <p className="text-pink-50 text-sm mb-6 font-medium">Need immediate medical advice or have an emergency?</p>
                <div className="space-y-3">
                  {formatTel(hospitalPhone) ? (
                    <Button
                      asChild
                      className="w-full bg-white text-secondary hover:bg-slate-50 hover:text-secondary font-bold transition-all duration-300 shadow-sm border border-transparent"
                    >
                      <a href={formatTel(hospitalPhone)!}>
                        <Phone className="w-4 h-4 mr-2" />
                        Call {data?.pregnancy?.hospital?.name || 'your hospital'}
                      </a>
                    </Button>
                  ) : (
                    <p className="text-xs text-pink-100/90 text-center px-2">
                      Hospital phone not on file — use Find Nearest Hospital below.
                    </p>
                  )}
                  <NearestHospitalsDialog
                    registeredHospitalId={registeredHospitalId}
                    trigger={
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-white/50 bg-transparent text-white hover:bg-white hover:text-secondary font-bold shadow-sm transition-all duration-300"
                      >
                        Find Nearest Hospital
                      </Button>
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Clinic-recorded allergies & medications */}
            <Card className="border-none shadow-lg ring-1 ring-[#D48BA1]/10">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#D48BA1]" />
                  Your clinic health record
                </CardTitle>
                <CardDescription className="text-xs">
                  Recorded by your hospital, doctor, or midwife
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Allergies</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data?.pregnancy?.allergies?.length ? (
                      data.pregnancy.allergies.map((a: string, i: number) => (
                        <Badge key={i} className="bg-orange-50 text-orange-800 border-orange-200 text-xs">
                          {a}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">None recorded yet</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Current medications</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data?.pregnancy?.medications?.length ? (
                      data.pregnancy.medications.map((m: string, i: number) => (
                        <Badge key={i} className="bg-blue-50 text-blue-800 border-blue-200 text-xs">
                          {m}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No medications on file yet</p>
                    )}
                  </div>
                </div>
                {data?.pregnancy?.medicalHistory && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Medical history</p>
                    <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                      {data.pregnancy.medicalHistory}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lab Results Quick View */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Recent Lab Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(data?.labs?.length ?? 0) > 0 ? (
                  data?.labs.map((lab, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{lab.testName}</p>
                        <p className="text-xs text-gray-500">{new Date(lab.resultDate).toLocaleDateString()}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-700 border-none">Normal</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 py-2">No recent lab results to display.</p>
                )}
                <Button asChild variant="link" className="text-blue-600 w-full p-0 text-sm font-bold block">
                  <Link href="/dashboard/pregnant-woman/digital-mch-book">
                    View Medical History
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <footer className="mt-12 rounded-2xl border border-slate-100 bg-white/80 px-6 py-4 shadow-sm">
          <InstallAppFooter />
        </footer>
      </div>
    </div>
  )
}

