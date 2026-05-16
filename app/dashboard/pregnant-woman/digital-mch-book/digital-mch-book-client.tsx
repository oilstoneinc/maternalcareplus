'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  ArrowLeft, 
  Sparkles, 
  Calendar, 
  Heart, 
  Baby, 
  ShieldCheck, 
  TrendingUp, 
  Award,
  ChevronRight,
  Stethoscope,
  CheckCircle2,
  UserCheck
} from 'lucide-react'
import Link from 'next/link'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'

export default function DigitalMCHBookClient({ data }: { data: any }) {
  const { pregnancy, user, ancVisits, delivery, child, immunizations, growth } = data
  const [activeSection, setActiveSection] = useState('pregnancy')

  const formatDate = (date: any) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  // Calculate weeks along
  const lmp = new Date(pregnancy.lmp)
  const now = new Date()
  const weeksAlong = Math.floor((now.getTime() - lmp.getTime()) / (1000 * 60 * 60 * 24 * 7))

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-slate-900 selection:bg-pink-100 pb-20">
      {/* Premium Header */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-pink-50 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/dashboard/pregnant-woman">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-pink-50 text-pink-500">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2 justify-center">
               <Sparkles className="w-4 h-4 text-pink-400" />
               MaternalCare Record Book
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">A Digital Legacy of Your Journey</p>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-8 space-y-12">
        {/* Navigation Tabs (Sleek Modern Approach) */}
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {[
            { id: 'pregnancy', label: 'Pregnancy ANC', icon: Heart },
            { id: 'delivery', label: 'The Big Day', icon: Baby, disabled: !delivery },
            { id: 'child', label: 'Baby Health', icon: ShieldCheck, disabled: !child }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveSection(tab.id)}
              disabled={tab.disabled}
              className={`flex items-center gap-3 px-6 py-4 rounded-3xl transition-all whitespace-nowrap border-2 shadow-sm ${
                activeSection === tab.id 
                ? 'bg-slate-900 border-slate-900 text-white shadow-slate-200' 
                : tab.disabled 
                  ? 'bg-slate-50 border-slate-50 text-slate-300 cursor-not-allowed'
                  : 'bg-white border-white text-slate-600 hover:border-pink-100 hover:text-pink-500'
              }`}
            >
              <tab.icon className={`w-5 h-5 ${activeSection === tab.id ? 'text-pink-400' : ''}`} />
              <span className="font-bold tracking-tight">{tab.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Pregnancy ANC Section */}
          {activeSection === 'pregnancy' && (
            <motion.div
              key="pregnancy"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              <section className="space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Your ANC Journey</h2>
                    <p className="text-slate-500 font-medium">Tracking your progress and appointments</p>
                  </div>
                  <Badge variant="outline" className="rounded-full border-pink-200 bg-pink-50 text-pink-600 font-bold px-4 py-1">
                    Week {weeksAlong}
                  </Badge>
                </div>

                <div className="space-y-4">
                   {ancVisits.map((visit: any, i: number) => (
                     <div key={visit.id} className="relative pl-10 group">
                        {/* Timeline Connector */}
                        {i !== ancVisits.length - 1 && (
                          <div className="absolute left-4 top-10 bottom-0 w-[2px] bg-slate-100 group-hover:bg-pink-100 transition-colors" />
                        )}
                        <div className={`absolute left-0 top-2 w-8 h-8 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${visit.status === 'completed' ? 'bg-pink-500' : 'bg-slate-200'}`}>
                           {visit.status === 'completed' ? <ShieldCheck className="w-3 h-3 text-white" /> : <Calendar className="w-3 h-3 text-slate-400" />}
                        </div>
                        <Card className="border-none shadow-sm group-hover:shadow-md transition-shadow">
                          <CardContent className="p-5 flex flex-col md:flex-row justify-between gap-4">
                            <div>
                               <p className="font-black text-slate-800">{formatDate(visit.actualDate || visit.scheduledDate)}</p>
                               <p className="text-sm text-slate-500 font-medium">ANC Visit • Gestational Age: {visit.gestationalAge} Weeks</p>
                            </div>
                            <div className="flex items-center gap-4">
                               <div className="text-right">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
                                  <p className={`text-sm font-bold ${visit.status === 'completed' ? 'text-green-500' : 'text-slate-500 uppercase'}`}>{visit.status}</p>
                               </div>
                               <div className="h-8 w-[1px] bg-slate-100" />
                               <div className="text-right">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weight</p>
                                  <p className="text-sm font-bold text-slate-800">{visit.weight ? `${visit.weight} kg` : '--'}</p>
                               </div>
                            </div>
                          </CardContent>
                        </Card>
                     </div>
                   ))}
                </div>
              </section>

              {/* Interventions Card */}
              <section>
                 <Card className="bg-slate-900 text-white rounded-[40px] overflow-hidden border-none shadow-2xl">
                    <CardContent className="p-8 md:p-12">
                       <h3 className="text-3xl font-black mb-8 leading-tight">Essential <br/><span className="text-pink-400">Protective</span> Measures</h3>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          <div className="space-y-4">
                             <div className="w-12 h-12 bg-pink-500/20 rounded-2xl flex items-center justify-center">
                                <Stethoscope className="w-6 h-6 text-pink-400" />
                             </div>
                             <div>
                                <h4 className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">IPTp Doses (Malaria)</h4>
                                <div className="flex gap-2 mt-2">
                                   {[1,2,3,4,5].map((d) => (
                                     <div key={d} className={`h-1.5 flex-1 rounded-full ${d <= (pregnancy.iptpDoses || 0) ? 'bg-pink-400' : 'bg-slate-800'}`} />
                                   ))}
                                </div>
                                <p className="text-xl font-black mt-2">{pregnancy.iptpDoses || 0} <span className="text-xs text-slate-500 font-bold uppercase">Received</span></p>
                             </div>
                          </div>
                          <div className="space-y-4">
                             <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                                <ShieldCheck className="w-6 h-6 text-blue-400" />
                             </div>
                             <div>
                                <h4 className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">TT Doses (Tetanus)</h4>
                                <div className="flex gap-2 mt-2">
                                   {[1,2,3,4,5].map((d) => (
                                     <div key={d} className={`h-1.5 flex-1 rounded-full ${d <= (pregnancy.ttDoses || 0) ? 'bg-blue-400' : 'bg-slate-800'}`} />
                                   ))}
                                </div>
                                <p className="text-xl font-black mt-2">{pregnancy.ttDoses || 0} <span className="text-xs text-slate-500 font-bold uppercase">Received</span></p>
                             </div>
                          </div>
                          <div className="space-y-4">
                             <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center">
                                <Baby className="w-6 h-6 text-green-400" />
                             </div>
                             <div>
                                <h4 className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Mosquito Net (ITN)</h4>
                                <div className="flex items-center gap-3 mt-4">
                                   <div className={`w-8 h-8 rounded-full flex items-center justify-center ${pregnancy.itnDistributed ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-600'}`}>
                                      <CheckCircle2 className="w-4 h-4" />
                                   </div>
                                   <p className="font-bold text-sm">{pregnancy.itnDistributed ? 'Distributed' : 'Not yet received'}</p>
                                </div>
                             </div>
                          </div>
                       </div>
                    </CardContent>
                 </Card>
              </section>
            </motion.div>
          )}

          {/* Delivery Day Section */}
          {activeSection === 'delivery' && delivery && (
            <motion.div
              key="delivery"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Welcome to the World!</h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Your Birth Keepsake Record</p>
              </div>

              <Card className="bg-white border-none shadow-2xl rounded-[40px] overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-400 via-blue-400 to-green-400" />
                <CardContent className="p-8 md:p-16">
                   <div className="flex flex-col md:flex-row gap-12 items-center">
                      <div className="w-48 h-48 bg-pink-50 rounded-full flex items-center justify-center flex-shrink-0 border-8 border-white shadow-xl">
                        <Baby className="w-24 h-24 text-pink-400" />
                      </div>
                      <div className="space-y-8 flex-1 w-full text-center md:text-left">
                        <div>
                          <p className="text-[10px] font-black text-pink-500 uppercase tracking-[0.3em] mb-2">The Miracle of Birth</p>
                          <h3 className="text-5xl font-black text-slate-900 tracking-tighter">{child?.sex} Infant</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                           <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Birth Date</p>
                              <p className="text-xl font-black text-slate-800">{formatDate(delivery.deliveryDate)}</p>
                           </div>
                           <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weight</p>
                              <p className="text-xl font-black text-slate-800">{child?.birthWeight} kg</p>
                           </div>
                           <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Length</p>
                              <p className="text-xl font-black text-slate-800">{child?.birthLength} cm</p>
                           </div>
                        </div>
                      </div>
                   </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Card className="border-none shadow-md bg-white rounded-3xl p-6">
                    <h4 className="font-bold text-slate-400 uppercase tracking-widest text-[10px] mb-4">Mode of Delivery</h4>
                    <p className="text-2xl font-black text-slate-800 uppercase">{delivery.modeOfDelivery}</p>
                    <p className="text-sm text-slate-500 mt-2 font-medium">Safe delivery at your health facility.</p>
                 </Card>
                 <Card className="border-none shadow-md bg-white rounded-3xl p-6">
                    <h4 className="font-bold text-slate-400 uppercase tracking-widest text-[10px] mb-4">Apgar Score</h4>
                    <p className="text-2xl font-black text-slate-800">{delivery.apgarScore1Min} / {delivery.apgarScore5Min}</p>
                    <p className="text-sm text-slate-500 mt-2 font-medium">Vital assessment at 1 and 5 minutes.</p>
                 </Card>
              </div>
            </motion.div>
          )}

          {/* Child Health Section */}
          {activeSection === 'child' && child && (
            <motion.div
              key="child"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              {/* Immunization Badges */}
              <section className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">Digital Immunization Shield</h2>
                  <p className="text-slate-500 font-medium">Badges earned for your child's protection</p>
                </div>
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
              </section>

              {/* Growth Curve */}
              <section className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">Growth Monitoring</h2>
                  <p className="text-slate-500 font-medium">Tracking your child's weight gain curve</p>
                </div>
                <Card className="border-none shadow-xl rounded-[40px] bg-white overflow-hidden p-8">
                  <div className="h-[350px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={growth.length > 0 ? growth : [{ ageInMonths: 0, weight: child.birthWeight }]}>
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
                </Card>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Action Hint */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
         <div className="bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-4 border border-slate-800">
            <UserCheck className="w-5 h-5 text-pink-400" />
            <span className="font-bold tracking-tight text-sm">Digitally Verified by Ghana Health Service</span>
         </div>
      </div>
    </div>
  )
}
