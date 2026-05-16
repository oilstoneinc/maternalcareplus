'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Activity, Calendar as CalendarIcon, FileText, Plus } from 'lucide-react'
import Link from 'next/link'
import { recordAntenatalVisit } from '@/app/actions' // We will use this to record vitals and schedule

export default function PatientProfileClient({ data }: { data: any }) {
  const { patient, pregnancy, vitals, appointments, labs } = data
  const [activeTab, setActiveTab] = useState('overview')
  const [showVitalForm, setShowVitalForm] = useState(false)

  const patientName = `${patient.firstName} ${patient.lastName}`.trim()
  const age = patient.dateOfBirth ? Math.floor((new Date().getTime() - new Date(patient.dateOfBirth).getTime()) / 3.15576e+10) : 'N/A'

  const formatDate = (date: any) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString()
  }

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
            <p className="text-slate-500 font-medium">Age: {age} • ID: {patient.id.substring(0,8).toUpperCase()}</p>
          </div>
        </div>

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
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-sm text-slate-500 font-medium">Blood Type</p>
              <p className="text-2xl font-bold text-slate-900">{pregnancy.bloodType || 'Unknown'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 bg-white rounded-xl p-1 shadow-sm">
            <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
            <TabsTrigger value="vitals" className="rounded-lg">Vitals & Checkups</TabsTrigger>
            <TabsTrigger value="appointments" className="rounded-lg">Appointments</TabsTrigger>
            <TabsTrigger value="labs" className="rounded-lg">Lab Results</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#D48BA1]" />
                  Medical History & Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      {pregnancy.allergies?.length ? pregnancy.allergies.map((a: string, i: number) => (
                        <Badge key={i} variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">{a}</Badge>
                      )) : <span className="text-slate-500 italic text-sm">None recorded</span>}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-1">Current Medications</h4>
                    <div className="flex flex-wrap gap-2">
                      {pregnancy.medications?.length ? pregnancy.medications.map((m: string, i: number) => (
                        <Badge key={i} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{m}</Badge>
                      )) : <span className="text-slate-500 italic text-sm">None recorded</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vitals" className="mt-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Checkup History</h2>
              <Button onClick={() => setShowVitalForm(true)} className="bg-[#D48BA1] hover:bg-[#c47a90] font-bold rounded-xl shadow-md">
                <Plus className="w-4 h-4 mr-2" /> Record Checkup
              </Button>
            </div>
            
            {showVitalForm && (
              <Card className="border-2 border-[#D48BA1] shadow-lg">
                <CardHeader className="bg-pink-50 rounded-t-xl pb-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-[#D48BA1]">New Checkup Entry</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setShowVitalForm(false)}>Cancel</Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <VitalForm pregnancyId={pregnancy.id} hospitalId={pregnancy.hospitalId} onComplete={() => setShowVitalForm(false)} />
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

          <TabsContent value="appointments" className="mt-6">
             <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Appointment Schedule</CardTitle>
                </div>
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
          
          <TabsContent value="labs" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Lab Results</CardTitle>
                <CardDescription>Recent tests and screenings</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-500 text-center py-6">No lab results found.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function VitalForm({ pregnancyId, hospitalId, onComplete }: { pregnancyId: string, hospitalId: string, onComplete: () => void }) {
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
    fhr: '', // Fetal Heart Rate
    presentation: '',
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Weight (kg)</label>
          <input type="number" step="0.1" required value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} className="w-full border-slate-200 rounded-lg p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">BP Systolic</label>
          <input type="number" required value={formData.bpSystolic} onChange={e => setFormData({...formData, bpSystolic: e.target.value})} className="w-full border-slate-200 rounded-lg p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">BP Diastolic</label>
          <input type="number" required value={formData.bpDiastolic} onChange={e => setFormData({...formData, bpDiastolic: e.target.value})} className="w-full border-slate-200 rounded-lg p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Heart Rate (bpm)</label>
          <input type="number" value={formData.heartRate} onChange={e => setFormData({...formData, heartRate: e.target.value})} className="w-full border-slate-200 rounded-lg p-2" />
        </div>
      </div>
      
      <div className="border-t border-slate-100 pt-4">
        <h4 className="font-semibold mb-3 text-slate-800">Fetal Assessment</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Gestational Age (wks)</label>
            <input type="number" required value={formData.gestationalAge} onChange={e => setFormData({...formData, gestationalAge: e.target.value})} className="w-full border-slate-200 rounded-lg p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fundal Height (cm)</label>
            <input type="number" step="0.1" value={formData.fundalHeight} onChange={e => setFormData({...formData, fundalHeight: e.target.value})} className="w-full border-slate-200 rounded-lg p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fetal Heart Rate</label>
            <input type="number" value={formData.fhr} onChange={e => setFormData({...formData, fhr: e.target.value})} className="w-full border-slate-200 rounded-lg p-2" />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Clinical Notes</label>
             <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full border-slate-200 rounded-lg p-2 min-h-[100px]" placeholder="Any clinical findings or notes..." />
          </div>
          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Schedule Next Visit</label>
             <input type="date" value={formData.nextVisitDate} onChange={e => setFormData({...formData, nextVisitDate: e.target.value})} className="w-full border-slate-200 rounded-lg p-2 mb-2" />
             <p className="text-xs text-slate-500">Leaving this blank will not schedule a follow-up.</p>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full bg-[#D48BA1] hover:bg-[#c47a90] text-white font-bold py-3 rounded-xl shadow-md">
        {loading ? 'Saving...' : 'Save Checkup Record'}
      </Button>
    </form>
  )
}
