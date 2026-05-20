'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  ArrowLeft, BookOpen, History, Activity, Baby, UserCheck, Plus, Save,
  CheckCircle2, AlertCircle, HeartPulse, Camera, Award, FileText, ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { 
  savePreviousPregnancy, 
  saveDeliveryRecord, 
  updateMCHPregnancyDetails, 
  savePostnatalCare,
  updateMCHChecklists
} from '@/app/actions'
import { useToast } from '@/hooks/use-toast'

export default function MCHBookClient({ data }: { data: any }) {
  const { 
    pregnancy, mother, previousPregnancies, ancVisits, labs, delivery, postnatalCare, children 
  } = data
  
  const mchData = pregnancy.mchData || {}
  
  const [activeChapter, setActiveChapter] = useState('family-id')
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const motherName = `${mother.firstName} ${mother.lastName}`.trim()
  const formatDate = (date: any) => date ? new Date(date).toLocaleDateString() : 'N/A'

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
    { id: 'coc', label: '14. MCH CoC Card', icon: Award }
  ]

  // Handlers
  const handleChecklistSave = async (category: string, values: any) => {
    setLoading(true)
    const res = await updateMCHChecklists(pregnancy.id, { [category]: values })
    setLoading(false)
    if (res.success) toast({ title: 'Saved', description: `${category} checklist updated.` })
    else toast({ title: 'Error', description: res.error, variant: 'destructive' })
  }

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
      pregnancyId: pregnancy.id, userId: mother.id,
      year: formData.get('year'), duration: formData.get('duration'),
      mode: formData.get('mode'), weight: formData.get('weight'),
      sex: formData.get('sex'), alive: formData.get('alive') === 'on' ? 'true' : 'false',
      complications: formData.get('complications')
    })
    setLoading(false)
    if (res.success) {
      toast({ title: 'Success', description: 'Previous pregnancy added' }); e.currentTarget.reset()
    } else toast({ title: 'Error', description: res.error, variant: 'destructive' })
  }

  const handleRecordDelivery = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const res = await saveDeliveryRecord({
      pregnancyId: pregnancy.id, motherId: mother.id,
      date: formData.get('date'), mode: formData.get('mode'),
      apgar1: formData.get('apgar1'), apgar5: formData.get('apgar5'),
      bloodLoss: formData.get('bloodLoss'), weight: formData.get('weight'),
      length: formData.get('length'), sex: formData.get('sex'),
      maternalComplications: formData.get('maternalComplications'),
      neonatalComplications: formData.get('neonatalComplications'),
      notes: formData.get('notes')
    })
    setLoading(false)
    if (res.success) toast({ title: 'Success', description: 'Delivery record saved' })
    else toast({ title: 'Error', description: res.error, variant: 'destructive' })
  }

  // Helper for checklist rendering
  const renderChecklist = (categoryKey: string, title: string, items: string[]) => {
    const currentData = mchData[categoryKey] || {}
    
    return (
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Check off topics as they are discussed with the patient.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const updates: any = {}
            items.forEach((item, idx) => {
              updates[`item_${idx}`] = formData.get(`item_${idx}`) === 'on'
            })
            handleChecklistSave(categoryKey, updates)
          }} className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-start space-x-3 p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                <input 
                  type="checkbox" 
                  name={`item_${idx}`} 
                  id={`item_${categoryKey}_${idx}`} 
                  defaultChecked={currentData[`item_${idx}`] === true}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-[#D48BA1] focus:ring-[#D48BA1]"
                />
                <Label htmlFor={`item_${categoryKey}_${idx}`} className="text-sm font-medium leading-relaxed text-slate-700 cursor-pointer">{item}</Label>
              </div>
            ))}
            <div className="pt-4 border-t border-slate-100">
              <Button type="submit" disabled={loading} className="bg-slate-900">
                <Save className="w-4 h-4 mr-2" /> {loading ? 'Saving...' : 'Save Progress'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-[#F6F4F3]">
      {/* Top Header Navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/hospital/patients/${pregnancy.id}`}>
            <Button variant="outline" size="icon" className="rounded-full shadow-sm hover:bg-slate-50">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-[#D48BA1]/10 text-[#D48BA1] border-[#D48BA1]/20 uppercase tracking-wider text-[10px] font-bold">
                Digital MCH Record Book
              </Badge>
              {pregnancy.status === 'completed' && <Badge className="bg-green-500">Completed</Badge>}
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">{motherName}</h1>
          </div>
        </div>
        <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 flex items-center gap-6 shadow-inner">
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
        {/* Vertical Sidebar */}
        <div className="w-full md:w-72 lg:w-80 flex-shrink-0 space-y-1">
          <div className="bg-white rounded-3xl p-3 shadow-sm border border-slate-100 sticky top-28">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-4 py-3 mb-2">Book Chapters</h3>
            {chapters.map(chapter => {
              const Icon = chapter.icon
              const isActive = activeChapter === chapter.id
              return (
                <button
                  key={chapter.id}
                  onClick={() => setActiveChapter(chapter.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all mb-1 ${
                    isActive 
                      ? 'bg-slate-900 text-white shadow-md transform scale-[1.02]' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#D48BA1]' : 'text-slate-400'}`} />
                    {chapter.label}
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-slate-400" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 pb-20">
          
          {/* 1. Family Identification */}
          {activeChapter === 'family-id' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Family Identification</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs uppercase font-bold">Mother's Name</Label>
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
                    <span className="font-bold text-[#D48BA1]">{formatDate(pregnancy.edd)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Blood Type</span>
                    <span className="font-bold">{pregnancy.bloodType} {pregnancy.rhesusFactor === 'Positive' ? '+' : '-'}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 2. Pregnancy Records */}
          {activeChapter === 'pregnancy' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Obstetric History (Previous Pregnancies)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="text-left border-b border-slate-100">
                        <tr>
                          <th className="pb-4 text-slate-400 text-[10px] uppercase font-bold">Year</th>
                          <th className="pb-4 text-slate-400 text-[10px] uppercase font-bold">Duration (wks)</th>
                          <th className="pb-4 text-slate-400 text-[10px] uppercase font-bold">Mode</th>
                          <th className="pb-4 text-slate-400 text-[10px] uppercase font-bold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {previousPregnancies.map((p: any) => (
                          <tr key={p.id}>
                            <td className="py-4 font-bold text-slate-800">{p.year}</td>
                            <td className="py-4 text-slate-600">{p.pregnancyDuration}</td>
                            <td className="py-4 text-slate-600 uppercase text-xs">{p.modeOfDelivery}</td>
                            <td className="py-4">
                              <Badge className={p.alive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                {p.alive ? 'Alive' : 'Deceased'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-8 border-t border-slate-50 pt-8">
                    <h4 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Add Previous Record
                    </h4>
                    <form onSubmit={handleAddPrevPregnancy} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Input name="year" type="number" required placeholder="Year" />
                      <Input name="duration" type="number" required placeholder="Duration (wks)" />
                      <Input name="mode" required placeholder="Mode (SVD/CS)" />
                      <Button type="submit" disabled={loading} className="w-full bg-slate-900">Add</Button>
                    </form>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader><CardTitle>Interventions (Malaria & Tetanus)</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdatePregnancyDetails} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2"><Label>IPTp Doses</Label><Input name="iptpDoses" type="number" defaultValue={pregnancy.iptpDoses} /></div>
                      <div className="space-y-2"><Label>TT Doses</Label><Input name="ttDoses" type="number" defaultValue={pregnancy.ttDoses} /></div>
                      <div className="flex items-center space-x-2 pt-8">
                        <input type="checkbox" name="itnDistributed" id="itnDistributed" defaultChecked={pregnancy.itnDistributed} className="w-4 h-4 rounded" />
                        <Label htmlFor="itnDistributed">ITN Distributed</Label>
                      </div>
                    </div>
                    <Button type="submit" disabled={loading} className="bg-slate-900">Save Interventions</Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 3. Delivery Records */}
          {activeChapter === 'delivery' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Labor and Delivery Record</CardTitle>
                </CardHeader>
                <CardContent>
                  {delivery ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
                        <Label>Delivery Date</Label>
                        <p className="text-xl font-black text-slate-800">{formatDate(delivery.deliveryDate)}</p>
                        <Label>Mode</Label>
                        <p className="text-xl font-black text-slate-800 uppercase">{delivery.modeOfDelivery}</p>
                      </div>
                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50 rounded-2xl">
                          <p className="text-blue-700 font-bold">Apgar (1 min / 5 min)</p>
                          <p className="text-2xl font-black text-blue-900">{delivery.apgarScore1Min} / {delivery.apgarScore5Min}</p>
                        </div>
                        <div className="p-4 bg-red-50 rounded-2xl">
                          <p className="text-red-700 font-bold">Blood Loss</p>
                          <p className="text-2xl font-black text-red-900">{delivery.bloodLoss} ml</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleRecordDelivery} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2"><Label>Date & Time</Label><Input name="date" type="datetime-local" required /></div>
                      <div className="space-y-2"><Label>Mode of Delivery</Label><Input name="mode" required /></div>
                      <div className="space-y-2"><Label>Blood Loss (ml)</Label><Input name="bloodLoss" type="number" required /></div>
                      <div className="space-y-2"><Label>Baby's Sex</Label>
                        <select name="sex" className="w-full h-10 px-3 border rounded-md"><option value="Male">Male</option><option value="Female">Female</option></select>
                      </div>
                      <div className="space-y-2"><Label>Birth Weight (kg)</Label><Input name="weight" step="0.01" type="number" required /></div>
                      <div className="space-y-2"><Label>Length (cm)</Label><Input name="length" step="0.1" type="number" required /></div>
                      <div className="space-y-2"><Label>Apgar 1</Label><Input name="apgar1" type="number" required /></div>
                      <div className="space-y-2"><Label>Apgar 5</Label><Input name="apgar5" type="number" required /></div>
                      <div className="space-y-2 md:col-span-2"><Label>Maternal Complications</Label><Textarea name="maternalComplications" /></div>
                      <div className="space-y-2 md:col-span-2"><Label>Neonatal Complications</Label><Textarea name="neonatalComplications" /></div>
                      <Button type="submit" disabled={loading} className="md:col-span-2 py-6 bg-slate-900 text-lg">Save Delivery Record</Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* 4. Postnatal Mother */}
          {activeChapter === 'postnatal-mother' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Postnatal Records for Mother</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {postnatalCare.map((visit: any) => (
                    <div key={visit.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex justify-between items-center mb-4">
                        <Badge className="bg-slate-900 uppercase">{visit.visitPeriod}</Badge>
                        <span className="text-sm font-bold">{formatDate(visit.visitDate)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><p className="text-slate-400 font-bold uppercase text-[9px]">Condition</p><p className="font-semibold">{visit.maternalCondition}</p></div>
                        <div><p className="text-slate-400 font-bold uppercase text-[9px]">Lochia</p><p className="font-semibold">{visit.lochia || 'N/A'}</p></div>
                        <div><p className="text-slate-400 font-bold uppercase text-[9px]">Perineum</p><p className="font-semibold">{visit.perineum || 'N/A'}</p></div>
                        <div><p className="text-slate-400 font-bold uppercase text-[9px]">Family Planning</p><p className="font-semibold">{visit.familyPlanningMethod || 'N/A'}</p></div>
                      </div>
                    </div>
                  ))}
                  {postnatalCare.length === 0 && <p className="text-center py-10 text-slate-400 italic">No maternal PNC records found.</p>}
                </CardContent>
              </Card>
            </div>
          )}

          {/* 5. Child ID */}
          {activeChapter === 'child-id' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Child Identification</CardTitle>
                </CardHeader>
                <CardContent>
                   {children.map((child: any) => (
                     <div key={child.id} className="flex flex-col md:flex-row items-center gap-8 bg-slate-50 p-8 rounded-3xl">
                        <div className="w-24 h-24 bg-[#D48BA1]/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <Baby className="w-12 h-12 text-[#D48BA1]" />
                        </div>
                        <div className="space-y-4 flex-1 w-full text-center md:text-left">
                          <p className="font-black text-3xl text-slate-800">{child.firstName || child.sex} {child.lastName || ''}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Sex</p><p className="font-bold">{child.sex}</p></div>
                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">DOB</p><p className="font-bold">{formatDate(child.dateOfBirth)}</p></div>
                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Weight</p><p className="font-bold">{child.birthWeight} kg</p></div>
                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Length</p><p className="font-bold">{child.birthLength} cm</p></div>
                          </div>
                        </div>
                     </div>
                   ))}
                   {children.length === 0 && <p className="text-center text-slate-400 py-10 italic">No child registered yet.</p>}
                </CardContent>
              </Card>
             </div>
          )}

          {/* 6. Postnatal Child */}
          {activeChapter === 'postnatal-child' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Postnatal Records for Child</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {postnatalCare.map((visit: any) => (
                    <div key={visit.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex justify-between items-center mb-4">
                        <Badge className="bg-slate-900 uppercase">{visit.visitPeriod}</Badge>
                        <span className="text-sm font-bold">{formatDate(visit.visitDate)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><p className="text-slate-400 font-bold uppercase text-[9px]">Baby Cond.</p><p className="font-semibold">{visit.babyCondition}</p></div>
                        <div><p className="text-slate-400 font-bold uppercase text-[9px]">Breastfeeding</p><p className="font-semibold">{visit.breastfeedingStatus}</p></div>
                        <div><p className="text-slate-400 font-bold uppercase text-[9px]">Umbilical Cord</p><p className="font-semibold">{visit.umbilicalCord || 'N/A'}</p></div>
                      </div>
                    </div>
                  ))}
                  {postnatalCare.length === 0 && <p className="text-center py-10 text-slate-400 italic">No child PNC records found.</p>}
                </CardContent>
              </Card>
            </div>
          )}

          {/* 7. Health Messages */}
          {activeChapter === 'health-messages' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               {renderChecklist('health_msgs_mother', 'Health Messages for Mother after Delivery', [
                 'Hygiene and perineal care',
                 'Nutrition and hydration needs',
                 'Importance of rest and sleep',
                 'Family planning introduction'
               ])}
               {renderChecklist('health_msgs_newborn', 'Health Messages for Newborn (Less than 1 month)', [
                 'Exclusive breastfeeding on demand',
                 'Cord care (keep clean and dry)',
                 'Keeping baby warm',
                 'Immunization schedule awareness'
               ])}
               {renderChecklist('health_msgs_child', 'Health Messages for Child (1 month to 5 years)', [
                 'Continued breastfeeding & complementary feeding at 6 months',
                 'Importance of weighing child regularly',
                 'Sleeping under ITN (Mosquito Net)',
                 'Hygiene (handwashing)'
               ])}
            </div>
          )}

          {/* 8. Child Growth & Dev */}
          {activeChapter === 'child-growth' && (
             <Card className="border-none shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
               <CardHeader>
                 <CardTitle>Records of Child Growth & Development</CardTitle>
                 <CardDescription>Track weight, length, and head circumference</CardDescription>
               </CardHeader>
               <CardContent>
                 <div className="bg-blue-50/50 rounded-2xl p-8 text-center border border-blue-100">
                   <Activity className="w-12 h-12 text-blue-300 mx-auto mb-4" />
                   <h3 className="font-bold text-slate-800 text-lg mb-2">Growth Chart Module</h3>
                   <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">Growth tracking is managed in the dedicated Child Health portal.</p>
                   {children.length > 0 && (
                     <Link href={`/dashboard/hospital/patients/${pregnancy.id}/mch-book/child`}>
                       <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8">Open Growth Tracker</Button>
                     </Link>
                   )}
                 </div>
               </CardContent>
             </Card>
          )}

          {/* 9. Nutrition Counselling */}
          {activeChapter === 'nutrition' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               {renderChecklist('nutrition_6_59', 'Nutrition Counselling for Caregiver (6-59 months)', [
                 'Start complementary feeding at 6 months',
                 'Feed thick porridge/family foods',
                 'Give animal source foods (egg, meat, fish)',
                 'Feed sick child frequently'
               ])}
            </div>
          )}

          {/* 10. Respectful Care */}
          {activeChapter === 'respectful-care' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               {renderChecklist('respectful_care', 'Nutrition Counselling Services & Respectful Care', [
                 'Greeted mother respectfully',
                 'Used visual aids for counselling',
                 'Allowed mother to ask questions',
                 'Checked understanding of feeding practices',
                 'Provided encouragement and praise'
               ])}
            </div>
          )}

          {/* 11. Look Out for Signs */}
          {activeChapter === 'signs' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               {renderChecklist('danger_signs_mother', 'Look Out for these Signs (Mother)', [
                 'Severe headache or blurred vision',
                 'Heavy vaginal bleeding',
                 'Foul smelling discharge',
                 'Fever or severe abdominal pain'
               ])}
               {renderChecklist('danger_signs_baby', 'Look Out for these Signs (Baby)', [
                 'Poor suckling or inability to feed',
                 'Fever or feels abnormally cold',
                 'Fast breathing or difficulty breathing',
                 'Yellow palms, soles, or eyes (Jaundice)',
                 'Red or pus discharging from umbilical cord'
               ])}
            </div>
          )}

          {/* 12. Milestones */}
          {activeChapter === 'milestones' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               {renderChecklist('milestones', 'Stages of Growth (Developmental Milestones)', [
                 'Social Smile (6 weeks)',
                 'Head Control (3 months)',
                 'Sitting without support (6-8 months)',
                 'Crawling (9 months)',
                 'Standing with support (10 months)',
                 'Walking independently (12-15 months)',
                 'First words (12 months)'
               ])}
             </div>
          )}

          {/* 13. Sweet Memories */}
          {activeChapter === 'memories' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <Card className="border-none shadow-sm bg-pink-50/30">
                 <CardHeader>
                   <CardTitle className="text-[#D48BA1]">Sweet Memories</CardTitle>
                   <CardDescription>A space for parents to record special moments</CardDescription>
                 </CardHeader>
                 <CardContent>
                    <form onSubmit={(e) => {
                      e.preventDefault()
                      const formData = new FormData(e.currentTarget)
                      handleChecklistSave('sweet_memories', {
                        first_smile: formData.get('first_smile'),
                        first_tooth: formData.get('first_tooth'),
                        first_step: formData.get('first_step'),
                        first_word: formData.get('first_word')
                      })
                    }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2"><Label>Date of First Smile</Label><Input name="first_smile" type="date" defaultValue={mchData.sweet_memories?.first_smile} /></div>
                      <div className="space-y-2"><Label>Date of First Tooth</Label><Input name="first_tooth" type="date" defaultValue={mchData.sweet_memories?.first_tooth} /></div>
                      <div className="space-y-2"><Label>Date of First Step</Label><Input name="first_step" type="date" defaultValue={mchData.sweet_memories?.first_step} /></div>
                      <div className="space-y-2"><Label>Baby's First Word</Label><Input name="first_word" defaultValue={mchData.sweet_memories?.first_word} /></div>
                      <div className="md:col-span-2 pt-4">
                        <Button type="submit" disabled={loading} className="bg-[#D48BA1] hover:bg-[#c47a90] text-white">
                          <Save className="w-4 h-4 mr-2" /> Save Memories
                        </Button>
                      </div>
                    </form>
                 </CardContent>
               </Card>
             </div>
          )}

          {/* 14. CoC Card */}
          {activeChapter === 'coc' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               {renderChecklist('coc_card', 'Maternal and Child Health Continuum of Care (CoC) Card', [
                 'Pregnancy Registration Completed',
                 '4+ ANC Visits Attended',
                 'Delivery by Skilled Attendant',
                 'Postnatal Care (Mother) Completed',
                 'Postnatal Care (Newborn) Completed',
                 'Exclusive Breastfeeding 6 Months',
                 'Fully Immunized Child (FIC)'
               ])}
             </div>
          )}

        </div>
      </div>
    </div>
  )
}
