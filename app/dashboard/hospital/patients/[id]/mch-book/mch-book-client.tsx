'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  ArrowLeft, 
  BookOpen, 
  History, 
  Activity, 
  Baby, 
  UserCheck, 
  Plus, 
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { 
  savePreviousPregnancy, 
  saveDeliveryRecord, 
  updateMCHPregnancyDetails, 
  savePostnatalCare 
} from '@/app/actions'
import { useToast } from '@/hooks/use-toast'

export default function MCHBookClient({ data }: { data: any }) {
  const { 
    pregnancy, 
    mother, 
    previousPregnancies, 
    ancVisits, 
    labs, 
    delivery, 
    postnatalCare,
    children 
  } = data
  
  const [activeTab, setActiveTab] = useState('demographics')
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const motherName = `${mother.firstName} ${mother.lastName}`.trim()

  const formatDate = (date: any) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString()
  }

  // Action Handlers
  const handleUpdatePregnancyDetails = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const res = await updateMCHPregnancyDetails({
      pregnancyId: pregnancy.id,
      iptpDoses: formData.get('iptpDoses'),
      ttDoses: formData.get('ttDoses'),
      itnDistributed: formData.get('itnDistributed') === 'on' ? 'true' : 'false'
    })
    setLoading(false)
    if (res.success) toast({ title: 'Success', description: 'Pregnancy details updated' })
    else toast({ title: 'Error', description: res.error, variant: 'destructive' })
  }

  const handleAddPrevPregnancy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const res = await savePreviousPregnancy({
      pregnancyId: pregnancy.id,
      userId: mother.id,
      year: formData.get('year'),
      duration: formData.get('duration'),
      mode: formData.get('mode'),
      weight: formData.get('weight'),
      sex: formData.get('sex'),
      alive: formData.get('alive') === 'on' ? 'true' : 'false',
      complications: formData.get('complications')
    })
    setLoading(false)
    if (res.success) {
      toast({ title: 'Success', description: 'Previous pregnancy added' })
      e.currentTarget.reset()
    } else toast({ title: 'Error', description: res.error, variant: 'destructive' })
  }

  const handleRecordDelivery = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const res = await saveDeliveryRecord({
      pregnancyId: pregnancy.id,
      motherId: mother.id,
      date: formData.get('date'),
      mode: formData.get('mode'),
      apgar1: formData.get('apgar1'),
      apgar5: formData.get('apgar5'),
      bloodLoss: formData.get('bloodLoss'),
      weight: formData.get('weight'),
      length: formData.get('length'),
      sex: formData.get('sex'),
      maternalComplications: formData.get('maternalComplications'),
      neonatalComplications: formData.get('neonatalComplications'),
      notes: formData.get('notes')
    })
    setLoading(false)
    if (res.success) toast({ title: 'Success', description: 'Delivery record saved' })
    else toast({ title: 'Error', description: res.error, variant: 'destructive' })
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/hospital/patients/${pregnancy.id}`}>
              <Button variant="outline" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 uppercase tracking-wider text-[10px] font-bold">
                  MCH Record Book
                </Badge>
                {pregnancy.status === 'completed' && <Badge className="bg-green-500">Completed</Badge>}
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">{motherName}</h1>
            </div>
          </div>
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-6">
            <div className="text-center px-4 border-r border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gravidity</p>
              <p className="text-xl font-black text-slate-800">{pregnancy.gravidity}</p>
            </div>
            <div className="text-center px-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Parity</p>
              <p className="text-xl font-black text-slate-800">{pregnancy.parity}</p>
            </div>
          </div>
        </div>

        {/* Tabbed Binder Container */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 bg-white p-1 rounded-2xl shadow-sm border border-slate-100 h-auto">
            <TabsTrigger value="demographics" className="rounded-xl py-3 data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
              <UserCheck className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Demographics</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl py-3 data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
              <History className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Obstetric History</span>
            </TabsTrigger>
            <TabsTrigger value="anc" className="rounded-xl py-3 data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
              <Activity className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">ANC Record</span>
            </TabsTrigger>
            <TabsTrigger value="delivery" className="rounded-xl py-3 data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
              <Baby className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Delivery</span>
            </TabsTrigger>
            <TabsTrigger value="pnc" className="rounded-xl py-3 data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">PNC & Child</span>
            </TabsTrigger>
          </TabsList>

          {/* Demographics Tab */}
          <TabsContent value="demographics">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Mother's Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs uppercase font-bold">Full Name</Label>
                    <p className="font-semibold text-slate-800">{motherName}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs uppercase font-bold">Age</Label>
                    <p className="font-semibold text-slate-800">{mother.dateOfBirth ? Math.floor((new Date().getTime() - new Date(mother.dateOfBirth).getTime()) / 31557600000) : 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs uppercase font-bold">Phone</Label>
                    <p className="font-semibold text-slate-800">{mother.phone || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs uppercase font-bold">Address</Label>
                    <p className="font-semibold text-slate-800">{mother.address}, {mother.city}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-slate-900 text-white">
                <CardHeader>
                  <CardTitle className="text-white">Pregnancy Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <span className="text-slate-400 text-sm">LMP</span>
                    <span className="font-bold">{formatDate(pregnancy.lmp)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <span className="text-slate-400 text-sm">EDD</span>
                    <span className="font-bold text-pink-400">{formatDate(pregnancy.edd)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Blood Type</span>
                    <span className="font-bold">{pregnancy.bloodType} {pregnancy.rhesusFactor === 'Positive' ? '+' : '-'}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Obstetric History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Previous Pregnancies</CardTitle>
                <CardDescription>Records from the Ghana MCH Obstetric History section</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="text-left border-b border-slate-100">
                      <tr>
                        <th className="pb-4 text-slate-400 text-[10px] uppercase font-bold">Year</th>
                        <th className="pb-4 text-slate-400 text-[10px] uppercase font-bold">Duration (wks)</th>
                        <th className="pb-4 text-slate-400 text-[10px] uppercase font-bold">Mode</th>
                        <th className="pb-4 text-slate-400 text-[10px] uppercase font-bold">Weight (kg)</th>
                        <th className="pb-4 text-slate-400 text-[10px] uppercase font-bold">Status</th>
                        <th className="pb-4 text-slate-400 text-[10px] uppercase font-bold">Complications</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {previousPregnancies.map((p: any) => (
                        <tr key={p.id}>
                          <td className="py-4 font-bold text-slate-800">{p.year}</td>
                          <td className="py-4 text-slate-600">{p.pregnancyDuration}</td>
                          <td className="py-4 text-slate-600 uppercase text-xs">{p.modeOfDelivery}</td>
                          <td className="py-4 text-slate-600">{p.birthWeight}</td>
                          <td className="py-4">
                            <Badge className={p.alive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                              {p.alive ? 'Alive' : 'Deceased'}
                            </Badge>
                          </td>
                          <td className="py-4 text-slate-500 text-sm">{p.complications || 'None'}</td>
                        </tr>
                      ))}
                      {previousPregnancies.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 italic">No previous records found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-8 border-t border-slate-50 pt-8">
                  <h4 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Previous Record
                  </h4>
                  <form onSubmit={handleAddPrevPregnancy} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="year">Year</Label>
                      <Input name="year" type="number" required placeholder="e.g. 2021" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (weeks)</Label>
                      <Input name="duration" type="number" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mode">Mode of Delivery</Label>
                      <Input name="mode" required placeholder="SVD / C-Section" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weight">Birth Weight (kg)</Label>
                      <Input name="weight" step="0.1" type="number" required />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="complications">Complications</Label>
                      <Input name="complications" placeholder="None, PPH, Pre-eclampsia, etc." />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" disabled={loading} className="w-full bg-slate-900">
                        {loading ? 'Saving...' : 'Add Record'}
                      </Button>
                    </div>
                  </form>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ANC Record Tab */}
          <TabsContent value="anc" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Interventions (Malaria & Tetanus)</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdatePregnancyDetails} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="iptpDoses">IPTp Doses Received (Malaria)</Label>
                        <Input name="iptpDoses" type="number" defaultValue={pregnancy.iptpDoses} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ttDoses">TT Doses Received (Tetanus)</Label>
                        <Input name="ttDoses" type="number" defaultValue={pregnancy.ttDoses} />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          name="itnDistributed" 
                          id="itnDistributed" 
                          defaultChecked={pregnancy.itnDistributed}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                        />
                        <Label htmlFor="itnDistributed">ITN Distributed (Mosquito Net)</Label>
                      </div>
                    </div>
                    <Button type="submit" disabled={loading} className="bg-slate-900">
                      <Save className="w-4 h-4 mr-2" />
                      {loading ? 'Updating...' : 'Save Interventions'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>ANC Visits Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {ancVisits.slice(0, 5).map((visit: any) => (
                    <div key={visit.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <div>
                        <p className="font-bold text-slate-800">{formatDate(visit.actualDate || visit.scheduledDate)}</p>
                        <p className="text-xs text-slate-500">Week {visit.gestationalAge}</p>
                      </div>
                      <Badge variant="outline" className="bg-white">{visit.weight} kg</Badge>
                    </div>
                  ))}
                  {ancVisits.length === 0 && <p className="text-center text-slate-400 py-4 italic">No visits recorded.</p>}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Delivery Record Tab */}
          <TabsContent value="delivery">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Labor and Delivery Record</CardTitle>
                <CardDescription>Digitizing the Ghana MCH Parturition section</CardDescription>
              </CardHeader>
              <CardContent>
                {delivery ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
                      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                        <Label className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Delivery Date</Label>
                        <p className="text-xl font-black text-slate-800">{formatDate(delivery.deliveryDate)}</p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                        <Label className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Mode</Label>
                        <p className="text-xl font-black text-slate-800 uppercase">{delivery.modeOfDelivery}</p>
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 rounded-2xl">
                          <p className="text-blue-700 font-bold">Apgar (1 min / 5 min)</p>
                          <p className="text-2xl font-black text-blue-900">{delivery.apgarScore1Min} / {delivery.apgarScore5Min}</p>
                        </div>
                        <div className="p-4 bg-red-50 rounded-2xl">
                          <p className="text-red-700 font-bold">Blood Loss</p>
                          <p className="text-2xl font-black text-red-900">{delivery.bloodLoss} ml</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <Label className="font-bold text-slate-800">Maternal Complications</Label>
                          <p className="text-slate-600">{delivery.maternalComplications || 'None recorded'}</p>
                        </div>
                        <div>
                          <Label className="font-bold text-slate-800">Neonatal Complications</Label>
                          <p className="text-slate-600">{delivery.neonatalComplications || 'None recorded'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleRecordDelivery} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="date">Date & Time of Delivery</Label>
                        <Input name="date" type="datetime-local" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mode">Mode of Delivery</Label>
                        <Input name="mode" required placeholder="SVD, CS, Vacuum, etc." />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bloodLoss">Estimated Blood Loss (ml)</Label>
                        <Input name="bloodLoss" type="number" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="apgar1">Apgar Score (1 min)</Label>
                        <Input name="apgar1" type="number" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="apgar5">Apgar Score (5 min)</Label>
                        <Input name="apgar5" type="number" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sex">Baby's Sex</Label>
                        <select name="sex" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="weight">Birth Weight (kg)</Label>
                        <Input name="weight" step="0.01" type="number" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="length">Birth Length (cm)</Label>
                        <Input name="length" step="0.1" type="number" required />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="maternalComplications">Maternal Complications</Label>
                        <Textarea name="maternalComplications" placeholder="PPH, Eclampsia, Tears, etc." />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="neonatalComplications">Neonatal Complications</Label>
                        <Textarea name="neonatalComplications" placeholder="Asphyxia, Jaundice, etc." />
                      </div>
                    </div>

                    <Button type="submit" disabled={loading} className="w-full bg-slate-900 py-6 text-lg">
                      {loading ? 'Saving Record...' : 'Complete Delivery Record'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PNC & Child Tab */}
          <TabsContent value="pnc" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Postnatal Care Record</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {postnatalCare.map((visit: any) => (
                      <div key={visit.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                        <div className="flex justify-between items-center">
                          <Badge className="bg-slate-900 uppercase text-[10px]">{visit.visitPeriod}</Badge>
                          <span className="text-sm font-bold text-slate-500">{formatDate(visit.visitDate)}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-slate-400 font-bold uppercase text-[9px]">Maternal Cond.</p>
                            <p className="font-semibold">{visit.maternalCondition}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-bold uppercase text-[9px]">Baby Cond.</p>
                            <p className="font-semibold">{visit.babyCondition}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-bold uppercase text-[9px]">Breastfeeding</p>
                            <p className="font-semibold">{visit.breastfeedingStatus}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {postnatalCare.length === 0 && (
                      <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-400 italic">No postnatal records found.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Child Summary</CardTitle>
                </CardHeader>
                <CardContent>
                   {children.map((child: any) => (
                     <div key={child.id} className="text-center space-y-4">
                        <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto">
                          <Baby className="w-10 h-10 text-pink-600" />
                        </div>
                        <div>
                          <p className="font-black text-xl text-slate-800">{child.sex} Infant</p>
                          <p className="text-sm text-slate-500">Born {formatDate(child.dateOfBirth)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-4">
                          <div className="p-3 bg-slate-50 rounded-xl">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Weight</p>
                            <p className="font-bold text-slate-800">{child.birthWeight} kg</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Length</p>
                            <p className="font-bold text-slate-800">{child.birthLength} cm</p>
                          </div>
                        </div>
                        <Link href={`/dashboard/hospital/patients/${pregnancy.id}/mch-book/child`}>
                          <Button variant="outline" className="w-full mt-4 border-slate-200">
                            Manage Child Health
                          </Button>
                        </Link>
                     </div>
                   ))}
                   {children.length === 0 && (
                     <p className="text-center text-slate-400 py-10 italic">Waiting for delivery...</p>
                   )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
