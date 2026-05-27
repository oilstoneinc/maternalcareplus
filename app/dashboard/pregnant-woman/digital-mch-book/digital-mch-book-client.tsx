'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  ArrowLeft, BookOpen, History, Activity, Baby, UserCheck, Save, Eye,
  CheckCircle2, AlertCircle, HeartPulse, Camera, Award, FileText, ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { updateMCHChecklists } from '@/app/actions'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { pusherClient, pusherEnabled } from '@/lib/pusher-client'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'

export default function DigitalMCHBookClient({
  data,
  readOnly = false,
  backHref = '/dashboard/pregnant-woman',
  titleBadge = 'My Digital MCH Record Book',
}: {
  data: any
  readOnly?: boolean
  backHref?: string
  titleBadge?: string
}) {
  const {
    pregnancy,
    mother,
    hospital,
    previousPregnancies,
    ancVisits,
    vitals = [],
    labs = [],
    delivery,
    postnatalCare,
    children,
    immunizations,
    growth,
  } = data

  const chapters = [
    { id: 'family-id', label: '1. Family Identification', icon: UserCheck },
    { id: 'pregnancy', label: '2. Pregnancy Records', icon: History },
    { id: 'delivery', label: '3. Delivery Records', icon: Baby },
    { id: 'postnatal-mother', label: '4. Postnatal (Mother)', icon: Activity },
    { id: 'child-id', label: '5. Child Identification', icon: FileText },
    { id: 'postnatal-child', label: '6. Postnatal (Child)', icon: Activity },
    { id: 'health-messages', label: '7. Health Messages', icon: CheckCircle2 },
    { id: 'child-growth', label: '8. Child Growth & Dev', icon: Activity },
    { id: 'nutrition', label: '9. Nutrition Counselling', icon: BookOpen },
    { id: 'respectful-care', label: '10. Respectful Care', icon: HeartPulse },
    { id: 'signs', label: '11. Look Out for Signs', icon: AlertCircle },
    { id: 'milestones', label: '12. Stages of Growth', icon: Activity },
    { id: 'memories', label: '13. Sweet Memories', icon: Camera },
    { id: 'coc', label: '14. MCH CoC Card', icon: Award },
  ]
  
  const mchData = pregnancy.mchData || {}
  const [activeChapter, setActiveChapter] = useState('family-id')
  /** Mobile: false = chapter list, true = full-width chapter content */
  const [showMobileContent, setShowMobileContent] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const activeChapterMeta = chapters.find((c) => c.id === activeChapter)

  const selectChapter = useCallback((chapterId: string) => {
    setActiveChapter(chapterId)
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
    if (isMobile) {
      setShowMobileContent(true)
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'instant' })
        contentRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
      })
    }
  }, [])

  const backToChapterList = useCallback(() => {
    setShowMobileContent(false)
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  }, [])

  useEffect(() => {
    if (!showMobileContent) return
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [activeChapter, showMobileContent])

  const motherName = `${mother.firstName} ${mother.lastName}`.trim()
  const formatDate = (date: any) => date ? new Date(date).toLocaleDateString() : 'N/A'

  useEffect(() => {
    if (
      readOnly ||
      !pusherEnabled
    ) {
      return
    }

    const channelName = `pregnancy-${pregnancy.id}`
    const channel = pusherClient.subscribe(channelName)

    const onUpdate = (payload: { message?: string }) => {
      toast({
        title: 'Record Updated',
        description: payload.message || 'Your health records were updated by your clinic.',
      })
      router.refresh()
    }

    channel.bind('mch-update', onUpdate)
    channel.bind('vitals-update', onUpdate)
    channel.bind('labs-update', onUpdate)

    return () => {
      channel.unbind('mch-update', onUpdate)
      channel.unbind('vitals-update', onUpdate)
      channel.unbind('labs-update', onUpdate)
      pusherClient.unsubscribe(channelName)
    }
  }, [pregnancy.id, router, toast, readOnly])

  const handleSaveSweetMemories = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const memories = {
      first_smile: formData.get('first_smile'),
      first_tooth: formData.get('first_tooth'),
      first_step: formData.get('first_step'),
      first_word: formData.get('first_word')
    }
    const res = await updateMCHChecklists(pregnancy.id, { sweet_memories: memories })
    setLoading(false)
    if (res.success) {
      toast({ title: 'Memories Saved! ✨', description: 'Your precious baby milestones have been updated.' })
      router.refresh()
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' })
    }
  }

  // Premium Read-Only Checklist Renderer
  const renderChecklistReadOnly = (categoryKey: string, title: string, items: string[], description: string) => {
    const currentData = mchData[categoryKey] || {}
    
    return (
      <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden ring-1 ring-black/5">
        <CardHeader className="border-b border-slate-50 pb-4">
          <CardTitle className="text-lg font-black text-slate-800">{title}</CardTitle>
          <CardDescription className="text-slate-500 font-medium text-xs mt-1">{description}</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          {items.map((item, idx) => {
            const isChecked = currentData[`item_${idx}`] === true
            return (
              <div key={idx} className={`flex items-start space-x-3 p-3.5 rounded-2xl transition-all border ${
                isChecked 
                  ? 'bg-pink-50/50 border-pink-100/50 text-pink-900' 
                  : 'bg-slate-50/50 border-slate-100/50 text-slate-500 opacity-60'
              }`}>
                <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isChecked ? 'bg-pink-500 text-white' : 'border-2 border-slate-300 text-transparent'
                }`}>
                  {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className={`text-sm font-bold leading-relaxed ${isChecked ? 'text-slate-800' : 'text-slate-500'}`}>
                  {item}
                </span>
              </div>
            )
          })}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-[#F6F4F3] text-slate-900">
      {/* Top Header Navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href={backHref}>
            <Button variant="outline" size="icon" className="rounded-full shadow-sm hover:bg-slate-50">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={
                  readOnly
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-100 uppercase tracking-wider text-[10px] font-bold'
                    : 'bg-pink-50 text-pink-600 border-pink-100 uppercase tracking-wider text-[10px] font-bold'
                }
              >
                {readOnly && <Eye className="w-3 h-3 mr-1 inline" />}
                {titleBadge}
              </Badge>
              {pregnancy.status === 'completed' && <Badge className="bg-green-500">Completed</Badge>}
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">{motherName}</h1>
          </div>
        </div>
        <div
          className={cn(
            'bg-slate-50 p-2.5 rounded-2xl border border-slate-200 flex items-center gap-6 shadow-inner',
            showMobileContent && 'hidden md:flex'
          )}
        >
          <div className="text-center px-4 border-r border-slate-200">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gravidity</p>
            <p className="text-xl font-black text-slate-900">{pregnancy.gravidity}</p>
          </div>
          <div className="text-center px-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Parity</p>
            <p className="text-xl font-black text-slate-900">{pregnancy.parity}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row max-w-[1600px] mx-auto p-4 md:p-8 gap-8">
        {/* Chapter list — full screen on mobile until a chapter is chosen */}
        <div
          className={cn(
            'w-full md:w-72 lg:w-80 flex-shrink-0',
            showMobileContent && 'hidden md:block'
          )}
        >
          <div className="bg-white rounded-3xl p-3 shadow-sm border border-slate-100 md:sticky md:top-28 max-h-[calc(100dvh-8rem)] md:max-h-none overflow-y-auto overscroll-contain">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-4 py-3 mb-2 sticky top-0 bg-white z-10">
              Book Chapters
            </h3>
            <p className="md:hidden px-4 pb-3 text-xs text-slate-500 font-medium">
              Tap a chapter to open your records
            </p>
            {chapters.map((chapter) => {
              const Icon = chapter.icon
              const isActive = activeChapter === chapter.id
              return (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() => selectChapter(chapter.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-bold transition-all mb-1 active:scale-[0.98]',
                    isActive && !showMobileContent
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <div className="flex items-center gap-3 text-left">
                    <Icon className={cn('w-4 h-4 flex-shrink-0', isActive && !showMobileContent ? 'text-pink-400' : 'text-slate-400')} />
                    <span>{chapter.label}</span>
                  </div>
                  <ChevronRight className={cn('w-4 h-4 flex-shrink-0', isActive && !showMobileContent ? 'text-pink-300' : 'text-slate-300')} />
                </button>
              )
            })}
          </div>
        </div>

        {/* Chapter content — full width on mobile after selection */}
        <div
          ref={contentRef}
          id="mch-chapter-content"
          className={cn(
            'flex-1 min-w-0 pb-20 scroll-mt-4',
            !showMobileContent && 'hidden md:block'
          )}
        >
          {/* Mobile: sticky back bar + chapter title */}
          <div className="md:hidden sticky top-0 z-20 -mx-4 px-4 py-3 mb-4 bg-[#F6F4F3]/95 backdrop-blur-md border-b border-slate-200/80">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={backToChapterList}
                className="rounded-full font-bold shrink-0 h-10 px-4 bg-white shadow-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Chapters
              </Button>
              <p className="font-black text-slate-900 text-sm leading-tight truncate flex-1">
                {activeChapterMeta?.label}
              </p>
            </div>
          </div>
          
          {/* 1. Family Identification */}
          {activeChapter === 'family-id' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="border-none shadow-sm rounded-3xl">
                <CardHeader>
                  <CardTitle>Family Identification</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs uppercase font-bold">Mother's Name</Label>
                    <p className="font-bold text-slate-800 text-lg">{motherName}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs uppercase font-bold">Age</Label>
                    <p className="font-bold text-slate-800 text-lg">{mother.dateOfBirth ? Math.floor((new Date().getTime() - new Date(mother.dateOfBirth).getTime()) / 31557600000) : 'N/A'} Years</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs uppercase font-bold">Phone Number</Label>
                    <p className="font-bold text-slate-800 text-lg">{mother.phone || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs uppercase font-bold">Residential Address</Label>
                    <p className="font-bold text-slate-800 text-lg">{mother.address || 'N/A'}, {mother.city || ''}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-slate-900 text-white rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-white">Active Pregnancy Specifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <span className="text-slate-400 text-sm font-semibold">Last Menstrual Period (LMP)</span>
                    <span className="font-bold text-lg">{formatDate(pregnancy.lmp)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <span className="text-slate-400 text-sm font-semibold">Estimated Date of Delivery (EDD)</span>
                    <span className="font-bold text-lg text-pink-400">{formatDate(pregnancy.edd)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm font-semibold">Blood Group & Rhesus Factor</span>
                    <span className="font-bold text-lg">
                      {pregnancy.bloodType || '—'}{' '}
                      {pregnancy.rhesusFactor === 'Positive' ? '+' : pregnancy.rhesusFactor === 'Negative' ? '-' : ''}
                    </span>
                  </div>
                  {hospital && (
                    <div className="flex justify-between items-center border-t border-slate-800 pt-3">
                      <span className="text-slate-400 text-sm font-semibold">Registered Facility</span>
                      <span className="font-bold text-lg">{hospital.name}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm rounded-3xl md:col-span-2">
                <CardHeader>
                  <CardTitle>Allergies & medications (from your clinic)</CardTitle>
                  <CardDescription>Entered by your hospital, doctor, or midwife</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-2">Allergies</p>
                      <div className="flex flex-wrap gap-2">
                        {pregnancy.allergies?.length ? (
                          pregnancy.allergies.map((a: string, i: number) => (
                            <Badge key={i} variant="outline" className="bg-orange-50 text-orange-800 border-orange-200">
                              {a}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">None recorded</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-2">Current medications</p>
                      <div className="flex flex-wrap gap-2">
                        {pregnancy.medications?.length ? (
                          pregnancy.medications.map((m: string, i: number) => (
                            <Badge key={i} variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                              {m}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">None recorded</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {pregnancy.medicalHistory && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-2">Medical history</p>
                      <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-4 border border-slate-100">
                        {pregnancy.medicalHistory}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* 2. Pregnancy Records */}
          {activeChapter === 'pregnancy' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <Card className="border-none shadow-sm rounded-3xl">
                <CardHeader>
                  <CardTitle>Obstetric History (Previous Pregnancies)</CardTitle>
                </CardHeader>
                <CardContent>
                  {previousPregnancies.length === 0 ? (
                    <p className="py-8 text-center text-slate-400 italic text-sm">No previous pregnancies registered.</p>
                  ) : (
                    <>
                      <div className="md:hidden space-y-3">
                        {previousPregnancies.map((p: any) => (
                          <div
                            key={p.id}
                            className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-bold text-slate-800">{p.year}</span>
                              <Badge
                                className={
                                  p.alive
                                    ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                    : 'bg-red-100 text-red-700 hover:bg-red-100'
                                }
                              >
                                {p.alive ? 'Alive' : 'Deceased'}
                              </Badge>
                            </div>
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                              <div>
                                <dt className="text-[10px] font-bold uppercase text-slate-400">Duration</dt>
                                <dd className="font-medium text-slate-800">
                                  {p.pregnancyDuration != null ? `${p.pregnancyDuration} wks` : '—'}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-[10px] font-bold uppercase text-slate-400">Delivery</dt>
                                <dd className="font-medium text-slate-800 uppercase">
                                  {p.modeOfDelivery || '—'}
                                </dd>
                              </div>
                              <div className="col-span-2">
                                <dt className="text-[10px] font-bold uppercase text-slate-400">Complications</dt>
                                <dd className="text-slate-600">{p.complications || 'None'}</dd>
                              </div>
                            </dl>
                          </div>
                        ))}
                      </div>
                      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full min-w-[640px] table-fixed border-collapse">
                          <colgroup>
                            <col style={{ width: '12%' }} />
                            <col style={{ width: '16%' }} />
                            <col style={{ width: '22%' }} />
                            <col style={{ width: '34%' }} />
                            <col style={{ width: '16%' }} />
                          </colgroup>
                          <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200">
                              <th className="px-4 py-3 text-left text-[10px] uppercase font-bold text-slate-500 tracking-wide">
                                Year
                              </th>
                              <th className="px-4 py-3 text-left text-[10px] uppercase font-bold text-slate-500 tracking-wide">
                                Duration
                              </th>
                              <th className="px-4 py-3 text-left text-[10px] uppercase font-bold text-slate-500 tracking-wide">
                                Mode
                              </th>
                              <th className="px-4 py-3 text-left text-[10px] uppercase font-bold text-slate-500 tracking-wide">
                                Complications
                              </th>
                              <th className="px-4 py-3 text-left text-[10px] uppercase font-bold text-slate-500 tracking-wide">
                                Child
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {previousPregnancies.map((p: any) => (
                              <tr key={p.id} className="border-b border-slate-50 last:border-0">
                                <td className="px-4 py-3.5 text-sm font-semibold text-slate-800 align-middle">
                                  {p.year}
                                </td>
                                <td className="px-4 py-3.5 text-sm text-slate-700 align-middle whitespace-nowrap">
                                  {p.pregnancyDuration != null ? `${p.pregnancyDuration} wks` : '—'}
                                </td>
                                <td className="px-4 py-3.5 text-sm font-medium text-slate-700 align-middle uppercase">
                                  {p.modeOfDelivery || '—'}
                                </td>
                                <td className="px-4 py-3.5 text-sm text-slate-600 align-middle">
                                  {p.complications || 'None'}
                                </td>
                                <td className="px-4 py-3.5 align-middle">
                                  <Badge
                                    className={
                                      p.alive
                                        ? 'bg-green-100 text-green-700 hover:bg-green-100 whitespace-nowrap'
                                        : 'bg-red-100 text-red-700 hover:bg-red-100 whitespace-nowrap'
                                    }
                                  >
                                    {p.alive ? 'Alive' : 'Deceased'}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm rounded-3xl">
                <CardHeader>
                  <CardTitle>ANC Interventions (Antenatal Care)</CardTitle>
                  <CardDescription>Vital medical protections administered during clinic visits</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-50 p-6 rounded-2xl flex flex-col justify-between">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">IPTp Doses (Malaria)</p>
                    <p className="text-3xl font-black text-slate-800 mt-2">{pregnancy.iptpDoses || 0} Doses</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-1">Intermittent Preventive Treatment for malaria</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-2xl flex flex-col justify-between">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">TT Doses (Tetanus)</p>
                    <p className="text-3xl font-black text-slate-800 mt-2">{pregnancy.ttDoses || 0} Doses</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-1">Tetanus Toxoid immunizations received</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-2xl flex flex-col justify-between">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mosquito Net (ITN)</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={pregnancy.itnDistributed ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'}>
                        {pregnancy.itnDistributed ? 'Distributed' : 'Pending'}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium mt-1">Insecticide-treated bednet distribution status</p>
                  </div>
                </CardContent>
              </Card>

              {/* Vitals from clinic */}
              <Card className="border-none shadow-sm rounded-3xl">
                <CardHeader>
                  <CardTitle>Vital Signs (from clinic)</CardTitle>
                  <CardDescription>Weight, blood pressure, and pulse recorded by your care team</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {vitals.map((v: any) => (
                    <div
                      key={v.id}
                      className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{formatDate(v.recordedDate)}</p>
                        <p className="text-xs text-slate-500 mt-1">{v.notes || 'Clinic vitals'}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Weight</p>
                          <p className="text-sm font-bold">{v.weight ? `${v.weight} kg` : '—'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">BP</p>
                          <p className="text-sm font-bold">
                            {v.bloodPressureSystolic && v.bloodPressureDiastolic
                              ? `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`
                              : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Pulse</p>
                          <p className="text-sm font-bold">{v.heartRate ? `${v.heartRate} bpm` : '—'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {vitals.length === 0 && (
                    <p className="text-center py-8 text-slate-400 italic">No vitals recorded yet. Your clinic will add these at your next visit.</p>
                  )}
                </CardContent>
              </Card>

              {/* Patient Antenatal Clinic Visits */}
              <Card className="border-none shadow-sm rounded-3xl">
                <CardHeader>
                  <CardTitle>Antenatal Clinic (ANC) Visits</CardTitle>
                  <CardDescription>Clinical monitoring history across your pregnancy journey</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {ancVisits
                    .filter((v: any) => v.status === 'completed')
                    .map((visit: any, idx: number, arr: any[]) => (
                    <div key={visit.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div>
                          <p className="font-bold text-slate-800">
                            Visit #{arr.length - idx} — {formatDate(visit.actualDate || visit.scheduledDate)}
                          </p>
                          <p className="text-xs text-slate-500 font-bold mt-1">
                            Gestational Age: {visit.gestationalAge ?? '—'} weeks
                            {visit.status && (
                              <Badge variant="outline" className="ml-2 text-[10px] capitalize">
                                {visit.status}
                              </Badge>
                            )}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-right">
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Weight</p>
                            <p className="text-sm font-bold text-slate-700">{visit.weight ? `${visit.weight} kg` : '—'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">BP</p>
                            <p className="text-sm font-bold text-slate-700">{visit.bloodPressure || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Hb</p>
                            <p className="text-sm font-bold text-slate-700">
                              {visit.hemoglobin ? `${visit.hemoglobin} g/dL` : '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">FHR</p>
                            <p className="text-sm font-bold text-slate-700">
                              {visit.fetalHeartRate ? `${visit.fetalHeartRate} bpm` : '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                      {(visit.findings || visit.recommendations) && (
                        <div className="text-sm border-t border-slate-100 pt-3 space-y-2">
                          {visit.findings && (
                            <p>
                              <span className="font-bold text-slate-600">Findings: </span>
                              {visit.findings}
                            </p>
                          )}
                          {visit.recommendations && (
                            <p>
                              <span className="font-bold text-slate-600">Plan: </span>
                              {visit.recommendations}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {ancVisits.filter((v: any) => v.status === 'completed').length === 0 && (
                    <p className="text-center py-10 text-slate-400 italic">No ANC clinical visits registered yet.</p>
                  )}
                </CardContent>
              </Card>

              {/* Labs & scans */}
              <Card className="border-none shadow-sm rounded-3xl">
                <CardHeader>
                  <CardTitle>Laboratory Tests & Scans</CardTitle>
                  <CardDescription>Results and imaging recorded by your hospital</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {labs.map((lab: any) => {
                    const isImg = lab.attachmentUrl && !lab.attachmentUrl.endsWith('.pdf')
                    return (
                    <div key={lab.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <p className="font-bold text-slate-800">{lab.testName}</p>
                        <Badge
                          className={`shrink-0 ${
                            lab.status === 'abnormal' || lab.status === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : lab.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {lab.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">
                        {lab.resultValue ? `Result: ${lab.resultValue}` : 'Pending result'}
                        {lab.normalRange && ` (Ref: ${lab.normalRange})`}
                      </p>
                      {lab.interpretation && (
                        <p className="text-xs text-slate-500 italic">{lab.interpretation}</p>
                      )}
                      <p className="text-[10px] text-slate-400 font-bold uppercase">
                        {lab.resultDate ? `Reported ${formatDate(lab.resultDate)}` : 'Ordered — awaiting results'}
                      </p>
                      {lab.attachmentUrl && (
                        <a
                          href={lab.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 mt-2 p-3 bg-white rounded-2xl border border-slate-200 hover:border-pink-300 hover:bg-pink-50/30 transition-all group w-full"
                        >
                          {isImg ? (
                            <img
                              src={lab.attachmentUrl}
                              alt={lab.attachmentName || 'Scan'}
                              className="w-12 h-12 object-cover rounded-xl border border-slate-100 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center shrink-0 border border-red-100">
                              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-700 truncate group-hover:text-pink-600 transition-colors">
                              {lab.attachmentName || 'View attached report'}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {isImg ? '🔬 Scan image · tap to view full size' : '📄 Lab report · tap to open PDF'}
                            </p>
                          </div>
                          <svg className="w-4 h-4 text-slate-300 group-hover:text-pink-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                    )
                  })}
                  {labs.length === 0 && (
                    <p className="text-center py-8 text-slate-400 italic">No lab tests or scans on file yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* 3. Delivery Records */}
          {activeChapter === 'delivery' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <Card className="border-none shadow-sm rounded-3xl">
                <CardHeader>
                  <CardTitle>Labor and Delivery Record</CardTitle>
                </CardHeader>
                <CardContent>
                  {delivery ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
                          <div>
                            <Label className="text-slate-400 text-xs font-bold uppercase">Delivery Date & Time</Label>
                            <p className="text-xl font-bold text-slate-800 mt-1">{formatDate(delivery.deliveryDate)}</p>
                          </div>
                          <div>
                            <Label className="text-slate-400 text-xs font-bold uppercase">Mode of Delivery</Label>
                            <p className="text-xl font-bold text-slate-800 uppercase mt-1">{delivery.modeOfDelivery}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-blue-50 rounded-2xl flex flex-col justify-between">
                            <p className="text-blue-700 text-xs font-bold uppercase">Apgar Score</p>
                            <p className="text-2xl font-black text-blue-900 mt-2">{delivery.apgarScore1Min} / {delivery.apgarScore5Min}</p>
                            <p className="text-[9px] text-blue-600/70 font-semibold">1 min & 5 min assessments</p>
                          </div>
                          <div className="p-4 bg-pink-50 rounded-2xl flex flex-col justify-between">
                            <p className="text-pink-700 text-xs font-bold uppercase">Est. Blood Loss</p>
                            <p className="text-2xl font-black text-pink-900 mt-2">{delivery.bloodLoss} ml</p>
                            <p className="text-[9px] text-pink-600/70 font-semibold">Postpartum blood loss volume</p>
                          </div>
                        </div>
                      </div>
                      
                      {(delivery.maternalComplications || delivery.neonatalComplications) && (
                        <div className="border-t border-slate-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                          {delivery.maternalComplications && (
                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                              <p className="text-xs font-bold text-amber-800 uppercase">Maternal Complications</p>
                              <p className="text-sm font-semibold text-slate-700 mt-2">{delivery.maternalComplications}</p>
                            </div>
                          )}
                          {delivery.neonatalComplications && (
                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                              <p className="text-xs font-bold text-amber-800 uppercase">Neonatal Complications</p>
                              <p className="text-sm font-semibold text-slate-700 mt-2">{delivery.neonatalComplications}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-50/50 rounded-3xl border border-slate-100">
                      <Baby className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="font-bold text-slate-700">Delivery records will appear after childbirth registration.</h3>
                      <p className="text-sm text-slate-400 mt-2">Your medical facility will record details of labor and delivery here.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* 4. Postnatal Mother */}
          {activeChapter === 'postnatal-mother' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <Card className="border-none shadow-sm rounded-3xl">
                <CardHeader>
                  <CardTitle>Postnatal Care (PNC) Records for Mother</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {postnatalCare.map((visit: any) => (
                    <div key={visit.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex justify-between items-center mb-4">
                        <Badge className="bg-slate-900 text-white uppercase text-[10px] font-bold px-3 py-1">{visit.visitPeriod}</Badge>
                        <span className="text-sm font-bold text-slate-500">{formatDate(visit.visitDate)}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px]">General Condition</p>
                          <p className="font-bold text-slate-800 mt-1">{visit.maternalCondition}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px]">Lochia</p>
                          <p className="font-bold text-slate-800 mt-1">{visit.lochia || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px]">Perineum Condition</p>
                          <p className="font-bold text-slate-800 mt-1">{visit.perineum || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px]">Family Planning Discussion</p>
                          <p className="font-bold text-slate-800 mt-1">{visit.familyPlanningMethod || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {postnatalCare.length === 0 && (
                    <div className="text-center py-12 bg-slate-50/50 rounded-3xl border border-slate-100">
                      <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="font-bold text-slate-700">No Postnatal Care visits recorded yet.</h3>
                      <p className="text-sm text-slate-400 mt-2">PNC records will be registered after delivery during postpartum follow-ups.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* 5. Child ID */}
          {activeChapter === 'child-id' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <Card className="border-none shadow-sm rounded-3xl">
                <CardHeader>
                  <CardTitle>Child Identification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                   {children.map((child: any) => (
                     <div key={child.id} className="flex flex-col md:flex-row items-center gap-8 bg-slate-50 p-8 rounded-3xl">
                        <div className="w-24 h-24 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center flex-shrink-0 border-4 border-white shadow-md">
                          <Baby className="w-12 h-12" />
                        </div>
                        <div className="space-y-4 flex-1 w-full text-center md:text-left">
                          <p className="font-black text-3xl text-slate-800">{child.firstName || 'Baby'} {child.lastName || ''}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Sex</p>
                              <p className="font-bold text-slate-800 mt-0.5">{child.sex}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Date of Birth</p>
                              <p className="font-bold text-slate-800 mt-0.5">{formatDate(child.dateOfBirth)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Birth Weight</p>
                              <p className="font-bold text-slate-800 mt-0.5">{child.birthWeight} kg</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Birth Length</p>
                              <p className="font-bold text-slate-800 mt-0.5">{child.birthLength} cm</p>
                            </div>
                          </div>
                        </div>
                     </div>
                   ))}
                   {children.length === 0 && (
                    <div className="text-center py-12 bg-slate-50/50 rounded-3xl border border-slate-100">
                      <Baby className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="font-bold text-slate-700">Child Identification records will appear postpartum.</h3>
                      <p className="text-sm text-slate-400 mt-2">Your baby's baseline profile will be registered here after birth.</p>
                    </div>
                   )}
                </CardContent>
              </Card>
             </div>
          )}

          {/* 6. Postnatal Child */}
          {activeChapter === 'postnatal-child' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <Card className="border-none shadow-sm rounded-3xl">
                <CardHeader>
                  <CardTitle>Postnatal Care (PNC) Records for Child</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {postnatalCare.map((visit: any) => (
                    <div key={visit.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex justify-between items-center mb-4">
                        <Badge className="bg-slate-900 text-white uppercase text-[10px] font-bold px-3 py-1">{visit.visitPeriod}</Badge>
                        <span className="text-sm font-bold text-slate-500">{formatDate(visit.visitDate)}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px]">Baby's General Condition</p>
                          <p className="font-bold text-slate-800 mt-1">{visit.babyCondition}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px]">Feeding Status</p>
                          <p className="font-bold text-slate-800 mt-1">{visit.breastfeedingStatus}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px]">Umbilical Cord Check</p>
                          <p className="font-bold text-slate-800 mt-1">{visit.umbilicalCord || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {postnatalCare.length === 0 && (
                    <div className="text-center py-12 bg-slate-50/50 rounded-3xl border border-slate-100">
                      <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="font-bold text-slate-700">No Postnatal Care records recorded for child yet.</h3>
                      <p className="text-sm text-slate-400 mt-2">Infant health records will be updated here during postnatal checkups.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* 7. Health Messages */}
          {activeChapter === 'health-messages' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               {renderChecklistReadOnly(
                 'health_msgs_mother', 
                 'Health Messages for Mother after Delivery', 
                 [
                   'Hygiene and perineal care',
                   'Nutrition and hydration needs',
                   'Importance of rest and sleep',
                   'Family planning introduction'
                 ],
                 'Essential recovery guidance checked off by hospital staff'
               )}
               {renderChecklistReadOnly(
                 'health_msgs_newborn', 
                 'Health Messages for Newborn (Less than 1 month)', 
                 [
                   'Exclusive breastfeeding on demand',
                   'Cord care (keep clean and dry)',
                   'Keeping baby warm',
                   'Immunization schedule awareness'
                 ],
                 'Crucial neonatal care directives verified by clinic'
               )}
               {renderChecklistReadOnly(
                 'health_msgs_child', 
                 'Health Messages for Child (1 month to 5 years)', 
                 [
                   'Continued breastfeeding & complementary feeding at 6 months',
                   'Importance of weighing child regularly',
                   'Sleeping under ITN (Mosquito Net)',
                   'Hygiene (handwashing)'
                 ],
                 'Ongoing childcare messages completed'
               )}
            </div>
          )}

          {/* 8. Child Growth & Dev */}
          {activeChapter === 'child-growth' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <Card className="border-none shadow-sm rounded-3xl">
                 <CardHeader>
                   <CardTitle>Records of Child Growth & Development</CardTitle>
                   <CardDescription>Tracking height, weight, and developmental progress</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-8">
                   {children.length > 0 ? (
                     <div className="space-y-6">
                       <div className="p-6 bg-pink-50/30 rounded-3xl border border-pink-100/50 flex flex-col md:flex-row justify-between items-center gap-4">
                         <div>
                           <h4 className="font-black text-slate-800 text-lg">Digital Growth Monitoring</h4>
                           <p className="text-slate-500 text-xs font-semibold mt-1">Review weight progress plotted against gestational norms</p>
                         </div>
                       </div>
                       
                       <div className="h-[350px] bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={growth.length > 0 ? growth : [{ ageInMonths: 0, weight: children[0].birthWeight }]}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                              <XAxis 
                                dataKey="ageInMonths" 
                                name="Age (Months)" 
                                label={{ value: 'Age in Months', position: 'insideBottomRight', offset: -10 }} 
                              />
                              <YAxis 
                                name="Weight (kg)" 
                                label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft' }} 
                              />
                              <Tooltip 
                                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="weight" 
                                stroke="#EC4899" 
                                strokeWidth={4} 
                                dot={{ r: 6, fill: '#EC4899', strokeWidth: 0 }} 
                                activeDot={{ r: 8 }} 
                              />
                            </LineChart>
                         </ResponsiveContainer>
                       </div>

                       {/* Digital Immunization Shield */}
                       <Card className="border-none shadow-sm">
                         <CardHeader className="px-0">
                           <CardTitle className="text-lg">Digital Immunization Shield</CardTitle>
                           <CardDescription>Badges earned for vaccines completed by clinic</CardDescription>
                         </CardHeader>
                         <CardContent className="px-0">
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {['BCG', 'OPV 0', 'Penta 1', 'Penta 2', 'Penta 3', 'Yellow Fever', 'Measles 1', 'Measles 2'].map((v) => {
                                const isDone = immunizations.some((i: any) => i.vaccineName === v)
                                return (
                                  <div key={v} className={`p-6 rounded-[32px] border-2 transition-all text-center space-y-3 ${isDone ? 'bg-pink-50 border-pink-100 shadow-sm' : 'bg-white border-slate-50 opacity-40 grayscale'}`}>
                                     <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center ${isDone ? 'bg-pink-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        <Award className="w-6 h-6" />
                                     </div>
                                     <div>
                                        <p className="font-black text-sm text-slate-800">{v}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{isDone ? 'Protected' : 'Pending'}</p>
                                     </div>
                                  </div>
                                )
                              })}
                           </div>
                         </CardContent>
                       </Card>
                     </div>
                   ) : (
                     <div className="text-center py-12 bg-slate-50/50 rounded-3xl border border-slate-100">
                       <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                       <h3 className="font-bold text-slate-700">Growth records will appear postpartum.</h3>
                       <p className="text-sm text-slate-400 mt-2">Immunization badges and growth curve plotting will display here after birth registration.</p>
                     </div>
                   )}
                 </CardContent>
               </Card>
             </div>
          )}

          {/* 9. Nutrition Counselling */}
          {activeChapter === 'nutrition' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               {renderChecklistReadOnly(
                 'nutrition_6_59', 
                 'Nutrition Counselling for Caregiver (6-59 months)', 
                 [
                   'Start complementary feeding at 6 months',
                   'Feed thick porridge/family foods',
                   'Give animal source foods (egg, meat, fish)',
                   'Feed sick child frequently'
                 ],
                 'Child nutritional counselling completed by clinical consultant'
               )}
            </div>
          )}

          {/* 10. Respectful Care */}
          {activeChapter === 'respectful-care' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               {renderChecklistReadOnly(
                 'respectful_care', 
                 'Nutrition Counselling Services & Respectful Care', 
                 [
                   'Greeted mother respectfully',
                   'Used visual aids for counselling',
                   'Allowed mother to ask questions',
                   'Checked understanding of feeding practices',
                   'Provided encouragement and praise'
                 ],
                 'Hospital patient dignity and respectful communication checklist'
               )}
            </div>
          )}

          {/* 11. Look Out for Signs */}
          {activeChapter === 'signs' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               {renderChecklistReadOnly(
                 'danger_signs_mother', 
                 'Look Out for these Signs (Mother Warning Signs)', 
                 [
                   'Severe headache or blurred vision',
                   'Heavy vaginal bleeding',
                   'Foul smelling discharge',
                   'Fever or severe abdominal pain'
                 ],
                 'Critical warning indices for mother postpartum'
               )}
               {renderChecklistReadOnly(
                 'danger_signs_baby', 
                 'Look Out for these Signs (Baby Warning Signs)', 
                 [
                   'Poor suckling or inability to feed',
                   'Fever or feels abnormally cold',
                   'Fast breathing or difficulty breathing',
                   'Yellow palms, soles, or eyes (Jaundice)',
                   'Red or pus discharging from umbilical cord'
                 ],
                 'Critical warning indices for newborn baby health'
               )}
            </div>
          )}

          {/* 12. Milestones */}
          {activeChapter === 'milestones' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               {renderChecklistReadOnly(
                 'milestones', 
                 'Stages of Growth (Developmental Milestones)', 
                 [
                   'Social Smile (6 weeks)',
                   'Head Control (3 months)',
                   'Sitting without support (6-8 months)',
                   'Crawling (9 months)',
                   'Standing with support (10 months)',
                   'Walking independently (12-15 months)',
                   'First words (12 months)'
                 ],
                 'Standard developmental thresholds tracked by medical practitioner'
               )}
             </div>
          )}

          {/* 13. Sweet Memories (Interactive for Parents!) */}
          {activeChapter === 'memories' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <Card className="border-none shadow-sm bg-pink-50/20 rounded-3xl border border-pink-100">
                 <CardHeader>
                   <CardTitle className="text-pink-600 flex items-center gap-2">
                     <Camera className="w-5 h-5 text-pink-500" />
                     Sweet Memories
                   </CardTitle>
                   <CardDescription className="text-slate-600 font-medium">A premium digital keepsake to record your baby's precious first milestones</CardDescription>
                 </CardHeader>
                 <CardContent>
                    {readOnly ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                          ['Date of First Smile', mchData.sweet_memories?.first_smile],
                          ['Date of First Tooth', mchData.sweet_memories?.first_tooth],
                          ['Date of First Step', mchData.sweet_memories?.first_step],
                          ['Baby\'s First Word', mchData.sweet_memories?.first_word],
                        ].map(([label, value]) => (
                          <div key={String(label)} className="space-y-1 p-4 rounded-2xl bg-white border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
                            <p className="text-sm font-bold text-slate-800">{value ? String(value) : '—'}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <form onSubmit={handleSaveSweetMemories} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-slate-600 font-bold">Date of First Smile</Label>
                          <Input name="first_smile" type="date" defaultValue={mchData.sweet_memories?.first_smile} className="bg-white border-slate-200" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-600 font-bold">Date of First Tooth</Label>
                          <Input name="first_tooth" type="date" defaultValue={mchData.sweet_memories?.first_tooth} className="bg-white border-slate-200" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-600 font-bold">Date of First Step</Label>
                          <Input name="first_step" type="date" defaultValue={mchData.sweet_memories?.first_step} className="bg-white border-slate-200" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-600 font-bold">Baby&apos;s First Word</Label>
                          <Input name="first_word" defaultValue={mchData.sweet_memories?.first_word} placeholder="e.g. Mama, Dada" className="bg-white border-slate-200" />
                        </div>
                        <div className="md:col-span-2 pt-4">
                          <Button type="submit" disabled={loading} className="bg-pink-600 hover:bg-pink-700 text-white rounded-full px-6 font-bold">
                            <Save className="w-4 h-4 mr-2" /> {loading ? 'Saving Keepsake...' : 'Save Sweet Keepsake'}
                          </Button>
                        </div>
                      </form>
                    )}
                 </CardContent>
               </Card>
             </div>
          )}

          {/* 14. CoC Card */}
          {activeChapter === 'coc' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               {renderChecklistReadOnly(
                 'coc_card', 
                 'Maternal and Child Health Continuum of Care (CoC) Card', 
                 [
                   'Pregnancy Registration Completed',
                   '4+ ANC Visits Attended',
                   'Delivery by Skilled Attendant',
                   'Postnatal Care (Mother) Completed',
                   'Postnatal Care (Newborn) Completed',
                   'Exclusive Breastfeeding 6 Months',
                   'Fully Immunized Child (FIC)'
                 ],
                 'Verified roadmap of maternal care milestones achieved'
               )}
             </div>
          )}

        </div>
      </div>
    </div>
  )
}
