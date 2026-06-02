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
  Plus, 
  ShieldAlert,
  Activity, 
  Baby, 
  Calendar,
  Sparkles,
  Award
} from 'lucide-react'
import Link from 'next/link'
import { recordImmunization, recordChildGrowth } from '@/app/actions'
import { useToast } from '@/hooks/use-toast'

export default function ChildHealthClient({ data }: { data: any }) {
  const { pregnancy, child, immunizations, growth } = data
  const [activeTab, setActiveTab] = useState('immunization')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const formatDate = (date: any) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString()
  }

  const handleAddImmunization = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const res = await recordImmunization({
      childId: child.id,
      pregnancyId: pregnancy.id,
      vaccineName: formData.get('vaccineName'),
      doseNumber: formData.get('doseNumber'),
      targetAge: formData.get('targetAge'),
      dateAdministered: formData.get('dateAdministered'),
      batchNumber: formData.get('batchNumber')
    })
    setLoading(false)
    if (res.success) {
      toast({ title: 'Success', description: 'Immunization recorded successfully' })
      e.currentTarget.reset()
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' })
    }
  }

  const handleAddGrowth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const res = await recordChildGrowth({
      childId: child.id,
      pregnancyId: pregnancy.id,
      recordDate: formData.get('recordDate'),
      ageInMonths: formData.get('ageInMonths'),
      weight: formData.get('weight'),
      height: formData.get('height'),
      headCircumference: formData.get('headCircumference'),
      notes: formData.get('notes')
    })
    setLoading(false)
    if (res.success) {
      toast({ title: 'Success', description: 'Growth record saved successfully' })
      e.currentTarget.reset()
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' })
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/hospital/patients/${pregnancy.id}/mch-book`}>
              <Button variant="outline" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200 uppercase tracking-wider text-[10px] font-bold">
                  Child Health Management
                </Badge>
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
                {child.sex} Infant Health Record
              </h1>
              <p className="text-slate-500 font-semibold text-sm">Born: {formatDate(child.dateOfBirth)}</p>
            </div>
          </div>
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-6">
            <div className="text-center px-4 border-r border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Birth Weight</p>
              <p className="text-xl font-black text-slate-800">{child.birthWeight} kg</p>
            </div>
            <div className="text-center px-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Birth Length</p>
              <p className="text-xl font-black text-slate-800">{child.birthLength} cm</p>
            </div>
          </div>
        </div>

        {/* Tabs Container */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-white p-1 rounded-2xl shadow-sm border border-slate-100 h-auto">
            <TabsTrigger value="immunization" className="rounded-xl py-3 data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
              <Award className="w-4 h-4 mr-2" />
              Immunization Schedule
            </TabsTrigger>
            <TabsTrigger value="growth" className="rounded-xl py-3 data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
              <Activity className="w-4 h-4 mr-2" />
              Growth Parameter History
            </TabsTrigger>
          </TabsList>

          {/* Immunization Tab */}
          <TabsContent value="immunization" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Recorded Vaccinations</CardTitle>
                  <CardDescription>Ghana Health Service official child immunization registry</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="text-left border-b border-slate-100">
                        <tr>
                          <th className="pb-4 text-slate-400 text-[10px] uppercase font-bold">Vaccine</th>
                          <th className="pb-4 text-slate-400 text-[10px] uppercase font-bold">Dose No.</th>
                          <th className="pb-4 text-slate-400 text-[10px] uppercase font-bold">Target Age</th>
                          <th className="pb-4 text-slate-400 text-[10px] uppercase font-bold">Date Admin.</th>
                          <th className="pb-4 text-slate-400 text-[10px] uppercase font-bold">Batch No.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {immunizations.map((imm: any) => (
                          <tr key={imm.id}>
                            <td className="py-4 font-bold text-slate-800">{imm.vaccineName}</td>
                            <td className="py-4 text-slate-600 font-semibold">{imm.doseNumber}</td>
                            <td className="py-4 text-slate-600">{imm.targetAge}</td>
                            <td className="py-4 text-slate-600">{formatDate(imm.dateAdministered)}</td>
                            <td className="py-4 font-mono text-xs text-slate-500">{imm.batchNumber || 'N/A'}</td>
                          </tr>
                        ))}
                        {immunizations.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400 italic">No immunizations recorded yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Add Vaccine Form */}
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Record Immunization</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddImmunization} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="vaccineName">Vaccine Name</Label>
                      <select name="vaccineName" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" title="Select Vaccine">
                        <option value="BCG">BCG (Tuberculosis)</option>
                        <option value="OPV 0">OPV 0 (Oral Polio)</option>
                        <option value="Penta 1">Penta 1 (DPT-HepB-Hib)</option>
                        <option value="Penta 2">Penta 2</option>
                        <option value="Penta 3">Penta 3</option>
                        <option value="OPV 1">OPV 1</option>
                        <option value="OPV 2">OPV 2</option>
                        <option value="OPV 3">OPV 3</option>
                        <option value="Rotavirus 1">Rotavirus 1</option>
                        <option value="Rotavirus 2">Rotavirus 2</option>
                        <option value="Yellow Fever">Yellow Fever</option>
                        <option value="Measles 1">Measles 1 (9 Months)</option>
                        <option value="Measles 2">Measles 2 (18 Months)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doseNumber">Dose Number</Label>
                      <Input name="doseNumber" type="number" defaultValue="1" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="targetAge">Target Age Milestone</Label>
                      <Input name="targetAge" placeholder="e.g. Birth, 6 Weeks, 9 Months" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateAdministered">Date Administered</Label>
                      <Input name="dateAdministered" type="date" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="batchNumber">Batch Number</Label>
                      <Input name="batchNumber" placeholder="e.g. B8328X" />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full bg-slate-900 mt-2">
                      {loading ? 'Recording...' : 'Add Vaccine to Card'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Growth Tab */}
          <TabsContent value="growth" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Child Growth Records</CardTitle>
                  <CardDescription>History of monthly checkups and parameters</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="text-left border-b border-slate-100">
                        <tr>
                          <th className="pb-4 text-slate-400 text-[10px] uppercase font-bold">Check Date</th>
                          <th className="pb-4 text-slate-400 text-[10px] uppercase font-bold">Age (Months)</th>
                          <th className="pb-4 text-slate-400 text-[10px] uppercase font-bold">Weight (kg)</th>
                          <th className="pb-4 text-slate-400 text-[10px] uppercase font-bold">Height (cm)</th>
                          <th className="pb-4 text-slate-400 text-[10px] uppercase font-bold">Head Circ (cm)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {growth.map((g: any) => (
                          <tr key={g.id}>
                            <td className="py-4 font-bold text-slate-800">{formatDate(g.recordDate)}</td>
                            <td className="py-4 text-slate-600 font-semibold">{g.ageInMonths}</td>
                            <td className="py-4 text-slate-600">{g.weight} kg</td>
                            <td className="py-4 text-slate-600">{g.height} cm</td>
                            <td className="py-4 text-slate-600">{g.headCircumference || 'N/A'} cm</td>
                          </tr>
                        ))}
                        {growth.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400 italic">No growth records found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Add Growth Form */}
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Record Growth Checkup</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddGrowth} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="recordDate">Check Date</Label>
                      <Input name="recordDate" type="date" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ageInMonths">Age in Months</Label>
                      <Input name="ageInMonths" type="number" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input name="weight" type="number" step="0.01" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="height">Height / Length (cm)</Label>
                      <Input name="height" type="number" step="0.1" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="headCircumference">Head Circumference (cm)</Label>
                      <Input name="headCircumference" type="number" step="0.1" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Clinical Notes</Label>
                      <Textarea name="notes" placeholder="General infant condition, feeding notes..." />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full bg-slate-900 mt-2">
                      {loading ? 'Saving...' : 'Record Growth Parameters'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
