'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Activity, Calendar as CalendarIcon, FileText, Plus, BookOpen, Users, FlaskConical, MessageCircle, Pencil, Check, X, Building2 } from 'lucide-react'
import HospitalCareHistoryPanel from '@/components/dashboard/HospitalCareHistoryPanel'
import Link from 'next/link'
import { recordAntenatalVisit, recordVitals, recordLabOrScan, assignMidwifeToPregnancy, scheduleNextVisit, updatePregnancyBloodType, updatePatientAge, updatePregnancyMedicalInfo, updatePregnancyStandingAdvice } from '@/app/actions'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

const clinicalFieldClass =
  'bg-white border-slate-300 text-slate-900 shadow-sm focus-visible:ring-[#D48BA1] focus-visible:border-[#D48BA1]'

const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

function formatBloodTypeDisplay(p: { bloodType?: string | null; rhesusFactor?: string | null }) {
  const bt = p.bloodType?.trim()
  if (!bt) return null
  if (/^(A|B|AB|O)[+-]$/.test(bt)) return bt
  if (p.rhesusFactor === 'Positive') return `${bt}+`
  if (p.rhesusFactor === 'Negative') return `${bt}-`
  return bt
}

function toCombinedBloodType(p: { bloodType?: string | null; rhesusFactor?: string | null }) {
  return formatBloodTypeDisplay(p) || ''
}

function calcAgeYears(dateOfBirth: string | Date | null | undefined): number | null {
  if (!dateOfBirth) return null
  const dob = new Date(dateOfBirth)
  if (Number.isNaN(dob.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1
  }
  return age
}

export default function PatientProfileClient({ data }: { data: any }) {
  const {
    patient,
    pregnancy,
    vitals,
    appointments,
    labs,
    onboardingHospital,
    currentHospitalId,
    currentHospital,
    isVisitingPatient,
    availableMidwives,
    careHistory = [],
    careFacilitySummary = [],
  } = data
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [showVitalForm, setShowVitalForm] = useState(false)
  const [showQuickVitals, setShowQuickVitals] = useState(false)
  const [showLabForm, setShowLabForm] = useState(false)
  const [assigningMidwife, setAssigningMidwife] = useState(false)
  const [editingBloodType, setEditingBloodType] = useState(false)
  const [bloodTypeValue, setBloodTypeValue] = useState(() => toCombinedBloodType(pregnancy))
  const [bloodTypeDisplay, setBloodTypeDisplay] = useState(
    () => formatBloodTypeDisplay(pregnancy) || 'Unknown'
  )
  const [savingBloodType, setSavingBloodType] = useState(false)
  const [editingAge, setEditingAge] = useState(false)
  const [ageValue, setAgeValue] = useState(() => {
    const years = calcAgeYears(patient.dateOfBirth)
    return years != null ? String(years) : ''
  })
  const [ageDisplay, setAgeDisplay] = useState(() => {
    const years = calcAgeYears(patient.dateOfBirth)
    return years != null ? String(years) : null
  })
  const [savingAge, setSavingAge] = useState(false)

  const patientName = `${patient.firstName} ${patient.lastName}`.trim()

  const formatDate = (date: any) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString()
  }

  const handleAssignMidwife = async (midwifeId: string) => {
    setAssigningMidwife(true)
    try {
      const res = await assignMidwifeToPregnancy(pregnancy.id, midwifeId)
      if (!res.success) alert(res.error || 'Failed to assign midwife')
    } catch (err) {
      console.error(err)
      alert('An error occurred')
    } finally {
      setAssigningMidwife(false)
    }
  }

  const assignedMidwife = availableMidwives?.find((m: any) => m.id === pregnancy.midwifeId)

  const handleSaveBloodType = async () => {
    if (!bloodTypeValue) {
      alert('Please select a blood type.')
      return
    }
    setSavingBloodType(true)
    try {
      const res = await updatePregnancyBloodType(pregnancy.id, bloodTypeValue)
      if (res.success) {
        setBloodTypeDisplay(res.display || bloodTypeValue)
        setEditingBloodType(false)
        router.refresh()
      } else {
        alert(res.error || 'Could not update blood type')
      }
    } finally {
      setSavingBloodType(false)
    }
  }

  const handleCancelBloodType = () => {
    setBloodTypeValue(toCombinedBloodType(pregnancy))
    setEditingBloodType(false)
  }

  const handleSaveAge = async () => {
    const parsed = parseInt(ageValue, 10)
    if (Number.isNaN(parsed)) {
      alert('Please enter a valid age in years.')
      return
    }
    setSavingAge(true)
    try {
      const res = await updatePatientAge(patient.id, parsed)
      if (res.success) {
        setAgeDisplay(String(res.age))
        setEditingAge(false)
        router.refresh()
      } else {
        alert(res.error || 'Could not update age')
      }
    } finally {
      setSavingAge(false)
    }
  }

  const handleCancelAge = () => {
    const years = calcAgeYears(patient.dateOfBirth)
    setAgeValue(years != null ? String(years) : '')
    setEditingAge(false)
  }

  useEffect(() => {
    setBloodTypeDisplay(formatBloodTypeDisplay(pregnancy) || 'Unknown')
    if (!editingBloodType) {
      setBloodTypeValue(toCombinedBloodType(pregnancy))
    }
  }, [pregnancy.bloodType, pregnancy.rhesusFactor, editingBloodType])

  useEffect(() => {
    if (!editingAge) {
      const years = calcAgeYears(patient.dateOfBirth)
      setAgeDisplay(years != null ? String(years) : null)
      setAgeValue(years != null ? String(years) : '')
    }
  }, [patient.dateOfBirth, editingAge])

  return (
    <div className="min-h-screen bg-[#F6F4F3] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard/hospital">
            <Button variant="outline" size="icon" className="rounded-full bg-white">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{patientName}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <div className="flex flex-wrap items-center gap-2 text-slate-500 font-medium">
                {editingAge ? (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="patient-age" className="sr-only">
                      Age in years
                    </Label>
                    <Input
                      id="patient-age"
                      type="number"
                      min={10}
                      max={60}
                      value={ageValue}
                      onChange={(e) => setAgeValue(e.target.value)}
                      className={`w-20 h-9 text-sm font-bold ${clinicalFieldClass}`}
                      disabled={savingAge}
                      placeholder="Age"
                    />
                    <span className="text-sm">years</span>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 bg-[#D48BA1] hover:bg-[#c47a90] font-bold px-2"
                      disabled={savingAge || !ageValue}
                      onClick={handleSaveAge}
                    >
                      {savingAge ? '…' : <Check className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 px-2"
                      disabled={savingAge}
                      onClick={handleCancelAge}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span>Age: {ageDisplay != null ? `${ageDisplay} years` : 'Not set'}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-1.5 text-slate-400 hover:text-[#D48BA1]"
                      onClick={() => {
                        const years = calcAgeYears(patient.dateOfBirth)
                        setAgeValue(years != null ? String(years) : '')
                        setEditingAge(true)
                      }}
                      aria-label="Edit age"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
                <span className="text-slate-300">•</span>
                <span>ID: {patient.id.substring(0, 8).toUpperCase()}</span>
              </div>
              {onboardingHospital && (
                <>
                  <span className="text-slate-300">•</span>
                  <Badge className="bg-indigo-50 text-indigo-700 border-indigo-250 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 flex items-center gap-1">
                    Primary Care Facility: {onboardingHospital.name} ({onboardingHospital.city})
                  </Badge>
                </>
              )}
            </div>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {patient?.id && (
              <Link href={`/dashboard/chat?with=${patient.id}`}>
                <Button variant="outline" className="rounded-xl font-bold">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message Patient
                </Button>
              </Link>
            )}
            <Link href={`/dashboard/hospital/patients/${pregnancy.id}/mch-book`}>
              <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                MCH Record Book
              </Button>
            </Link>
          </div>
        </div>

        {isVisitingPatient && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
            <Building2 className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-amber-900">Visiting patient — national MCH continuity</p>
              <p className="text-amber-800/90 mt-1 leading-relaxed">
                Home facility: <strong>{onboardingHospital?.name}</strong> ({onboardingHospital?.city}). You are
                documenting care at <strong>{currentHospital?.name || 'your hospital'}</strong>. Updates are saved to
                her unified record; she is notified, and other hospitals can see this timeline.
              </p>
            </div>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white">
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-sm text-slate-500 font-medium">Gestational Age</p>
              <p className="text-2xl font-bold text-slate-900">{pregnancy.gestationalAge || 0} Weeks</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-sm text-slate-500 font-medium">Expected Delivery</p>
              <p className="text-2xl font-bold text-[#D48BA1]">{formatDate(pregnancy.edd)}</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-sm text-slate-500 font-medium">Risk Status</p>
              <div>
                <Badge className={pregnancy.riskFactors?.length ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                  {pregnancy.riskFactors?.length ? 'High Risk' : 'Low Risk'}
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 flex flex-col justify-center gap-2">
              <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-slate-500 font-medium">Blood Type</p>
                {!editingBloodType && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-slate-500 hover:text-[#D48BA1]"
                    onClick={() => {
                      setBloodTypeValue(toCombinedBloodType(pregnancy) || '')
                      setEditingBloodType(true)
                    }}
                    aria-label="Edit blood type"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              {editingBloodType ? (
                <div className="space-y-2">
                  <select
                    value={bloodTypeValue}
                    onChange={(e) => setBloodTypeValue(e.target.value)}
                    className={`w-full h-10 rounded-md px-3 text-sm font-bold ${clinicalFieldClass}`}
                    disabled={savingBloodType}
                  >
                    <option value="">Select blood type</option>
                    {BLOOD_TYPE_OPTIONS.map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1 bg-[#D48BA1] hover:bg-[#c47a90] font-bold"
                      disabled={savingBloodType || !bloodTypeValue}
                      onClick={handleSaveBloodType}
                    >
                      {savingBloodType ? 'Saving…' : (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Save
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={savingBloodType}
                      onClick={handleCancelBloodType}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-2xl font-bold text-slate-900">{bloodTypeDisplay}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 bg-white rounded-xl p-1 shadow-sm">
            <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
            <TabsTrigger value="care-history" className="rounded-lg">Care history</TabsTrigger>
            <TabsTrigger value="vitals" className="rounded-lg">Vitals & Checkups</TabsTrigger>
            <TabsTrigger value="appointments" className="rounded-lg">Appointments</TabsTrigger>
            <TabsTrigger value="labs" className="rounded-lg">Lab Results</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            <Card>
              <CardHeader className="bg-indigo-50/50 border-b border-indigo-50/50 rounded-t-xl">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Primary Care Team
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-slate-800">Assigned care contact (messages)</h4>
                    <p className="text-sm text-slate-600">
                      {assignedMidwife ? `${assignedMidwife.firstName} ${assignedMidwife.lastName}` : 'No staff assigned — patient cannot message until you assign someone.'}
                    </p>
                  </div>
                  {availableMidwives && availableMidwives.length > 0 && (
                    <div className="flex items-center gap-2">
                      <select 
                        disabled={assigningMidwife}
                        onChange={(e) => {
                          if (e.target.value) handleAssignMidwife(e.target.value)
                        }}
                        className="text-sm border border-slate-200 rounded-lg p-2.5 bg-white font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                        value={pregnancy.midwifeId || ''}
                      >
                        <option value="" disabled>Select Staff to Assign...</option>
                        {availableMidwives.map((m: any) => (
                          <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                        ))}
                      </select>
                      {assigningMidwife && <span className="text-xs font-bold text-indigo-500 animate-pulse ml-2">Assigning...</span>}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <MedicalHistoryEditor pregnancy={pregnancy} onSaved={() => router.refresh()} />

            <StandingAdviceEditor pregnancy={pregnancy} onSaved={() => router.refresh()} />
          </TabsContent>

          <TabsContent value="care-history" className="mt-6">
            <HospitalCareHistoryPanel
              history={careHistory}
              facilitySummary={careFacilitySummary}
              homeHospitalName={onboardingHospital?.name}
            />
          </TabsContent>

          <TabsContent value="vitals" className="mt-6 space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <h2 className="text-xl font-bold text-slate-800">Checkup History</h2>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setShowQuickVitals(true); setShowVitalForm(false) }}
                  className="font-bold rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-2" /> Vitals Only
                </Button>
                <Button onClick={() => { setShowVitalForm(true); setShowQuickVitals(false) }} className="bg-[#D48BA1] hover:bg-[#c47a90] font-bold rounded-xl shadow-md">
                  <Plus className="w-4 h-4 mr-2" /> Full ANC Visit
              </Button>
              </div>
            </div>

            {showQuickVitals && (
              <Card className="border-2 border-slate-300 shadow-lg">
                <CardHeader className="bg-slate-50 rounded-t-xl pb-4">
                  <div className="flex justify-between items-center">
                    <CardTitle>Record Vitals</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setShowQuickVitals(false)}>Cancel</Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <QuickVitalsForm
                    pregnancyId={pregnancy.id}
                    onComplete={() => { setShowQuickVitals(false); router.refresh() }}
                  />
                </CardContent>
              </Card>
            )}
            
            {showVitalForm && (
              <Card className="border-2 border-[#D48BA1] shadow-lg">
                <CardHeader className="bg-pink-50 rounded-t-xl pb-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-[#D48BA1]">New Checkup Entry</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setShowVitalForm(false)}>Cancel</Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                   <VitalForm pregnancyId={pregnancy.id} hospitalId={currentHospitalId || pregnancy.hospitalId} pregnancy={pregnancy} onComplete={() => { setShowVitalForm(false); router.refresh() }} />
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {vitals.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-slate-100">
                  <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No vitals recorded yet.</p>
                </div>
              ) : (
                vitals.map((v: any) => (
                  <Card key={v.id}>
                    <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="bg-pink-50 p-3 rounded-xl">
                          <Activity className="w-6 h-6 text-[#D48BA1]" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{formatDate(v.recordedDate)}</p>
                          <p className="text-sm text-slate-500 mt-1">{v.notes || 'Routine checkup'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <p className="text-xs text-slate-500 uppercase font-bold">Weight</p>
                          <p className="font-bold text-slate-800">{v.weight || '--'} kg</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <p className="text-xs text-slate-500 uppercase font-bold">BP</p>
                          <p className="font-bold text-slate-800">{v.bloodPressureSystolic}/{v.bloodPressureDiastolic}</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <p className="text-xs text-slate-500 uppercase font-bold">Heart Rate</p>
                          <p className="font-bold text-slate-800">{v.heartRate || '--'} bpm</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="appointments" className="mt-6 space-y-6">
            <Card className="border-2 border-[#D48BA1]/30">
              <CardHeader className="bg-pink-50/50">
                <CardTitle>Schedule next visit</CardTitle>
                <CardDescription>Patient will see this on her dashboard immediately</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ScheduleVisitForm pregnancyId={pregnancy.id} onComplete={() => router.refresh()} />
              </CardContent>
            </Card>
             <Card>
              <CardHeader>
                <CardTitle>Appointment history</CardTitle>
              </CardHeader>
              <CardContent>
                {appointments.length === 0 ? (
                   <p className="text-slate-500 text-center py-6">No appointments found.</p>
                ) : (
                  <div className="space-y-4">
                    {appointments.map((apt: any) => (
                      <div key={apt.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <CalendarIcon className="w-5 h-5 text-slate-400" />
                          <div>
                            <p className="font-bold text-slate-800">{formatDate(apt.scheduledDate)}</p>
                            <p className="text-sm text-slate-500 capitalize">Status: {apt.status}</p>
                            {apt.notes && <p className="text-xs text-slate-400 mt-1">{apt.notes}</p>}
                          </div>
                        </div>
                        <Badge variant="outline" className={apt.status === 'scheduled' ? 'border-blue-200 text-blue-700 bg-blue-50' : 'border-green-200 text-green-700 bg-green-50'}>
                          {apt.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="labs" className="mt-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Labs & Imaging</h2>
              <Button onClick={() => setShowLabForm(true)} className="bg-slate-900 hover:bg-slate-800 font-bold rounded-xl">
                <FlaskConical className="w-4 h-4 mr-2" /> Add Lab / Scan
              </Button>
            </div>

            {showLabForm && (
              <Card className="border-2 border-slate-300 shadow-lg">
                <CardHeader className="bg-slate-50 rounded-t-xl">
                  <div className="flex justify-between items-center">
                    <CardTitle>New Lab Test or Scan</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setShowLabForm(false)}>Cancel</Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <LabScanForm pregnancyId={pregnancy.id} onComplete={() => { setShowLabForm(false); router.refresh() }} />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Lab Results & Scans</CardTitle>
                <CardDescription>Visible to the patient on her dashboard and MCH book</CardDescription>
              </CardHeader>
              <CardContent>
                {labs.length === 0 ? (
                  <p className="text-slate-500 text-center py-6">No lab results or scans recorded yet.</p>
                ) : (
                  <div className="space-y-4">
                    {labs.map((lab: any) => (
                      <div key={lab.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-slate-900">{lab.testName}</p>
                          <Badge variant="outline" className="capitalize">{lab.status}</Badge>
                        </div>
                        <p className="text-sm text-slate-600 mt-2">
                          {lab.resultValue || 'Pending'}
                          {lab.normalRange && <span className="text-slate-400"> (Ref: {lab.normalRange})</span>}
                        </p>
                        {lab.interpretation && <p className="text-xs text-slate-500 mt-1">{lab.interpretation}</p>}
                        <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase">
                          {lab.resultDate ? `Result: ${formatDate(lab.resultDate)}` : 'Awaiting results'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function ScheduleVisitForm({ pregnancyId, onComplete }: { pregnancyId: string; onComplete: () => void }) {
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date) return
    setLoading(true)
    try {
      const res = await scheduleNextVisit(pregnancyId, date, notes)
      if (res.success) {
        setDate('')
        setNotes('')
        onComplete()
      } else {
        alert(res.error || 'Failed to schedule')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <Input
        type="date"
        required
        value={date}
        onChange={(e) => setDate(e.target.value)}
        min={new Date().toISOString().split('T')[0]}
        className={`flex-1 ${clinicalFieldClass}`}
      />
      <Input
        type="text"
        placeholder="Visit notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className={`flex-[2] ${clinicalFieldClass}`}
      />
      <Button type="submit" disabled={loading} className="bg-[#D48BA1] hover:bg-[#c47a90] font-bold shrink-0">
        {loading ? 'Saving...' : 'Schedule'}
      </Button>
    </form>
  )
}

function QuickVitalsForm({ pregnancyId, onComplete }: { pregnancyId: string; onComplete: () => void }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    pregnancyId,
    weight: '',
    bpSystolic: '',
    bpDiastolic: '',
    heartRate: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await recordVitals(form)
      if (res.success) onComplete()
      else alert(res.error || 'Failed to save vitals')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label>Weight (kg)</Label>
          <Input type="number" step="0.1" required value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className={clinicalFieldClass} />
        </div>
        <div className="space-y-1.5">
          <Label>BP Systolic</Label>
          <Input type="number" required value={form.bpSystolic} onChange={(e) => setForm({ ...form, bpSystolic: e.target.value })} className={clinicalFieldClass} />
        </div>
        <div className="space-y-1.5">
          <Label>BP Diastolic</Label>
          <Input type="number" required value={form.bpDiastolic} onChange={(e) => setForm({ ...form, bpDiastolic: e.target.value })} className={clinicalFieldClass} />
        </div>
        <div className="space-y-1.5">
          <Label>Pulse (bpm)</Label>
          <Input type="number" value={form.heartRate} onChange={(e) => setForm({ ...form, heartRate: e.target.value })} className={clinicalFieldClass} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`min-h-[80px] ${clinicalFieldClass}`} />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold rounded-xl">
        {loading ? 'Saving...' : 'Save Vitals'}
      </Button>
    </form>
  )
}

function LabScanForm({ pregnancyId, onComplete }: { pregnancyId: string; onComplete: () => void }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    pregnancyId,
    testType: 'lab' as 'lab' | 'scan',
    testName: '',
    resultValue: '',
    normalRange: '',
    interpretation: '',
    status: 'completed' as 'pending' | 'completed' | 'abnormal' | 'critical',
    resultDate: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await recordLabOrScan(form)
      if (res.success) onComplete()
      else alert(res.error || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
          <select value={form.testType} onChange={e => setForm({ ...form, testType: e.target.value as 'lab' | 'scan' })} className="w-full border border-slate-200 rounded-lg p-2">
            <option value="lab">Laboratory test</option>
            <option value="scan">Ultrasound / scan</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
          <input required placeholder="e.g. Hemoglobin, Anatomy scan" value={form.testName} onChange={e => setForm({ ...form, testName: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Result</label>
          <input value={form.resultValue} onChange={e => setForm({ ...form, resultValue: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2" placeholder="Leave empty if pending" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Reference range</label>
          <input value={form.normalRange} onChange={e => setForm({ ...form, normalRange: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Clinical interpretation</label>
        <textarea value={form.interpretation} onChange={e => setForm({ ...form, interpretation: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 min-h-[80px]" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as typeof form.status })} className="w-full border border-slate-200 rounded-lg p-2">
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="abnormal">Abnormal</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Result date</label>
          <input type="date" value={form.resultDate} onChange={e => setForm({ ...form, resultDate: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2" />
        </div>
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold rounded-xl">
        {loading ? 'Saving...' : 'Save to patient record'}
      </Button>
    </form>
  )
}

function listToComma(arr?: string[] | null) {
  return (arr || []).join(', ')
}

function StandingAdviceEditor({
  pregnancy,
  onSaved,
}: {
  pregnancy: any
  onSaved: () => void
}) {
  const mch = (pregnancy.mchData as Record<string, unknown>) || {}
  const [advice, setAdvice] = useState((mch.standingAdvice as string) || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await updatePregnancyStandingAdvice(pregnancy.id, advice)
      if (res.success) onSaved()
      else alert(res.error || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-2 border-emerald-100">
      <CardHeader>
        <CardTitle className="text-lg">Patient dashboard — Recommended for You</CardTitle>
        <CardDescription>
          This advice appears on the pregnant woman&apos;s home screen. ANC visit &quot;Recommendations / plan&quot; also
          show automatically after each visit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={advice}
          onChange={(e) => setAdvice(e.target.value)}
          placeholder="e.g. Take iron daily, attend ANC every 4 weeks, watch for severe headache or swelling..."
          className={`min-h-[100px] ${clinicalFieldClass}`}
        />
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 font-bold"
        >
          {saving ? 'Publishing…' : 'Publish to patient dashboard'}
        </Button>
      </CardContent>
    </Card>
  )
}

function MedicalHistoryEditor({
  pregnancy,
  onSaved,
}: {
  pregnancy: any
  onSaved: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    medicalHistory: pregnancy.medicalHistory || '',
    allergies: listToComma(pregnancy.allergies),
    medications: listToComma(pregnancy.medications),
  })

  useEffect(() => {
    if (!editing) {
      setForm({
        medicalHistory: pregnancy.medicalHistory || '',
        allergies: listToComma(pregnancy.allergies),
        medications: listToComma(pregnancy.medications),
      })
    }
  }, [pregnancy.medicalHistory, pregnancy.allergies, pregnancy.medications, editing])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await updatePregnancyMedicalInfo(pregnancy.id, form)
      if (res.success) {
        setEditing(false)
        onSaved()
      } else {
        alert(res.error || 'Could not save')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#D48BA1]" />
            Medical History & Notes
          </CardTitle>
          <CardDescription className="mt-1">
            Saved here appears on the patient&apos;s dashboard and digital MCH book.
          </CardDescription>
        </div>
        {!editing ? (
          <Button type="button" variant="outline" size="sm" className="font-bold shrink-0" onClick={() => setEditing(true)}>
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Edit
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {editing ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="medicalHistory">General medical history</Label>
              <Textarea
                id="medicalHistory"
                value={form.medicalHistory}
                onChange={(e) => setForm({ ...form, medicalHistory: e.target.value })}
                placeholder="Previous conditions, surgeries, chronic illness..."
                className={`min-h-[100px] ${clinicalFieldClass}`}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="allergies">Allergies</Label>
                <Input
                  id="allergies"
                  value={form.allergies}
                  onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                  placeholder="Penicillin, peanuts (comma-separated)"
                  className={clinicalFieldClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="medications">Current medications</Label>
                <Input
                  id="medications"
                  value={form.medications}
                  onChange={(e) => setForm({ ...form, medications: e.target.value })}
                  placeholder="Folic acid, iron, paracetamol (comma-separated)"
                  className={clinicalFieldClass}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                className="bg-[#D48BA1] hover:bg-[#c47a90] font-bold"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? 'Saving…' : 'Save to patient record'}
              </Button>
              <Button type="button" variant="outline" disabled={saving} onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <h4 className="font-semibold text-slate-800 mb-1">General Medical History</h4>
              <p className="text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                {pregnancy.medicalHistory || 'No medical history recorded.'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-slate-800 mb-1">Allergies</h4>
                <div className="flex flex-wrap gap-2">
                  {pregnancy.allergies?.length ? (
                    pregnancy.allergies.map((a: string, i: number) => (
                      <Badge key={i} variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        {a}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-slate-500 italic text-sm">None recorded</span>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 mb-1">Current Medications</h4>
                <div className="flex flex-wrap gap-2">
                  {pregnancy.medications?.length ? (
                    pregnancy.medications.map((m: string, i: number) => (
                      <Badge key={i} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {m}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-slate-500 italic text-sm">None recorded</span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function VitalForm({ pregnancyId, hospitalId, onComplete, pregnancy }: { pregnancyId: string, hospitalId: string, onComplete: () => void, pregnancy?: any }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    pregnancyId,
    hospitalId,
    weight: '',
    bpSystolic: '',
    bpDiastolic: '',
    heartRate: '',
    gestationalAge: '',
    fundalHeight: '',
    fhr: '',
    presentation: '',
    hemoglobin: '',
    proteinuria: '',
    edema: '',
    findings: '',
    recommendations: '',
    prescribedMedications: '',
    allergies: listToComma(pregnancy?.allergies),
    medications: listToComma(pregnancy?.medications),
    medicalHistory: pregnancy?.medicalHistory || '',
    notes: '',
    nextVisitDate: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await recordAntenatalVisit(formData)
      if (res.success) {
        onComplete()
      } else {
        alert(res.error || 'Failed to record visit')
      }
    } catch (err) {
      console.error(err)
      alert('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="weight">Weight (kg)</Label>
          <Input
            id="weight"
            type="number"
            step="0.1"
            required
            value={formData.weight}
            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
            className={clinicalFieldClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bpSystolic">BP Systolic</Label>
          <Input
            id="bpSystolic"
            type="number"
            required
            value={formData.bpSystolic}
            onChange={(e) => setFormData({ ...formData, bpSystolic: e.target.value })}
            className={clinicalFieldClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bpDiastolic">BP Diastolic</Label>
          <Input
            id="bpDiastolic"
            type="number"
            required
            value={formData.bpDiastolic}
            onChange={(e) => setFormData({ ...formData, bpDiastolic: e.target.value })}
            className={clinicalFieldClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="heartRate">Heart Rate (bpm)</Label>
          <Input
            id="heartRate"
            type="number"
            value={formData.heartRate}
            onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
            className={clinicalFieldClass}
          />
        </div>
      </div>

      <div className="border-t border-slate-200 pt-5">
        <h4 className="font-semibold mb-4 text-slate-800">Fetal Assessment</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="gestationalAge">Gestational Age (wks)</Label>
            <Input
              id="gestationalAge"
              type="number"
              required
              value={formData.gestationalAge}
              onChange={(e) => setFormData({ ...formData, gestationalAge: e.target.value })}
              className={clinicalFieldClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fundalHeight">Fundal Height (cm)</Label>
            <Input
              id="fundalHeight"
              type="number"
              step="0.1"
              value={formData.fundalHeight}
              onChange={(e) => setFormData({ ...formData, fundalHeight: e.target.value })}
              className={clinicalFieldClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fhr">Fetal Heart Rate</Label>
            <Input
              id="fhr"
              type="number"
              value={formData.fhr}
              onChange={(e) => setFormData({ ...formData, fhr: e.target.value })}
              className={clinicalFieldClass}
            />
          </div>
        </div>
      </div>
      
      <div className="border-t border-slate-200 pt-5">
        <h4 className="font-semibold mb-4 text-slate-800">Additional assessments</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="space-y-1.5">
            <Label htmlFor="hemoglobin">Hemoglobin (g/dL)</Label>
            <Input
              id="hemoglobin"
              type="number"
              step="0.1"
              value={formData.hemoglobin}
              onChange={(e) => setFormData({ ...formData, hemoglobin: e.target.value })}
              className={clinicalFieldClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proteinuria">Proteinuria</Label>
            <Input
              id="proteinuria"
              value={formData.proteinuria}
              onChange={(e) => setFormData({ ...formData, proteinuria: e.target.value })}
              placeholder="Negative / Trace / +"
              className={clinicalFieldClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edema">Edema</Label>
            <Input
              id="edema"
              value={formData.edema}
              onChange={(e) => setFormData({ ...formData, edema: e.target.value })}
              className={clinicalFieldClass}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="findings">Clinical findings</Label>
            <Textarea
              id="findings"
              value={formData.findings}
              onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
              className={`min-h-[88px] ${clinicalFieldClass}`}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="recommendations">Recommendations / plan</Label>
            <Textarea
              id="recommendations"
              value={formData.recommendations}
              onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
              className={`min-h-[88px] ${clinicalFieldClass}`}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-5">
        <h4 className="font-semibold mb-4 text-slate-800">Allergies & medications (updates patient app)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-1.5">
            <Label htmlFor="anc-allergies">Allergies</Label>
            <Input
              id="anc-allergies"
              value={formData.allergies}
              onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
              placeholder="Comma-separated"
              className={clinicalFieldClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="anc-medications">Full medication list</Label>
            <Input
              id="anc-medications"
              value={formData.medications}
              onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
              placeholder="Replaces list if filled"
              className={clinicalFieldClass}
            />
          </div>
        </div>
        <div className="space-y-1.5 mb-4">
          <Label htmlFor="prescribedMedications">Medications prescribed this visit</Label>
          <Input
            id="prescribedMedications"
            value={formData.prescribedMedications}
            onChange={(e) => setFormData({ ...formData, prescribedMedications: e.target.value })}
            placeholder="e.g. Folic acid 5mg, Ferrous sulphate (added to patient list)"
            className={clinicalFieldClass}
          />
          <p className="text-xs text-slate-500">New entries are added to the patient&apos;s medication list without removing existing ones.</p>
        </div>
        <div className="space-y-1.5 mb-4">
          <Label htmlFor="anc-medicalHistory">Medical history note</Label>
          <Textarea
            id="anc-medicalHistory"
            value={formData.medicalHistory}
            onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
            className={`min-h-[72px] ${clinicalFieldClass}`}
          />
        </div>
      </div>

      <div className="border-t border-slate-200 pt-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="notes">Visit notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes..."
              className={`min-h-[100px] ${clinicalFieldClass}`}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nextVisitDate">Schedule next visit</Label>
            <Input
              id="nextVisitDate"
              type="date"
              value={formData.nextVisitDate}
              onChange={(e) => setFormData({ ...formData, nextVisitDate: e.target.value })}
              className={clinicalFieldClass}
            />
            <p className="text-xs text-slate-500">Leave blank to skip scheduling a follow-up.</p>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-[#D48BA1] hover:bg-[#c47a90] text-white font-bold py-3 rounded-xl shadow-md"
      >
        {loading ? 'Saving...' : 'Save Checkup Record'}
      </Button>
    </form>
  )
}
