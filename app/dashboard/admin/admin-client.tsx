'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Shield, 
  Users, 
  Settings, 
  Activity, 
  Database, 
  Search, 
  MoreVertical, 
  UserPlus,
  ArrowUpRight,
  TrendingUp,
  Server,
  Lock,
  Mail,
  Trash2,
  Edit,
  Building2,
  MapPin,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts'
import { assignUserToHospital } from '@/app/actions'

interface AdminDashboardProps {
  user: any
  data: any
}

export default function AdminDashboardClient({ user, data }: AdminDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [assigningUser, setAssigningUser] = useState<string | null>(null)
  const [selectedHospital, setSelectedHospital] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const userCounts = data?.userCounts || []
  const allUsers = data?.allUsers || []
  const allHospitals = data?.allHospitals || []

  const COLORS = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6']

  const stats = [
    { label: 'Total Users', value: allUsers.length, icon: Users, color: 'text-blue-500' },
    { label: 'Hospitals', value: allHospitals.length, icon: Building2, color: 'text-indigo-500' },
    { label: 'DB Connections', value: 'Active', icon: Database, color: 'text-purple-500' },
    { label: 'Security', value: 'High', icon: Shield, color: 'text-green-500' },
  ]

  const handleAssign = async (userId: string) => {
    if (!userId || !selectedHospital) return
    setIsUpdating(true)
    try {
      const res = await assignUserToHospital(userId, selectedHospital)
      if (res.success) {
         setAssigningUser(null)
         setSelectedHospital('')
         window.location.reload() // Force refresh to show new assignments
      } else {
         alert('Failed: ' + res.error)
      }
    } catch (e) {
      alert('Error assigning hospital')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Console</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              System Online • {user?.emailAddresses?.[0]?.emailAddress}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100">
            <UserPlus className="h-4 w-4" /> Add Admin
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-none bg-white shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <h3 className="text-2xl font-bold tracking-tight">{stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-none shadow-xl bg-white/60 backdrop-blur-md min-h-[600px] overflow-hidden">
            <Tabs defaultValue="users" className="w-full">
              <div className="px-6 pt-6 flex items-center justify-between border-b pb-4">
                <TabsList className="bg-muted/50 p-1 rounded-xl">
                  <TabsTrigger value="users" className="rounded-lg px-6">User Records</TabsTrigger>
                  <TabsTrigger value="hospitals" className="rounded-lg px-6">Hospitals</TabsTrigger>
                  <TabsTrigger value="system" className="rounded-lg px-6">Status</TabsTrigger>
                </TabsList>
                <div className="relative group hidden md:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Search records..."
                    className="pl-9 pr-4 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm w-48 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <TabsContent value="users" className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-muted/30 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Full Name</th>
                        <th className="px-6 py-4">Role / Institution</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {allUsers.map((u: any) => (
                        <tr key={u.id} className="hover:bg-indigo-50/20 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold">{u.firstName} {u.lastName}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">{u.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <Badge variant="outline" className="rounded-full px-3 py-0 scale-90 origin-left">
                                {u.role === 'hospital_staff' ? 'Hospital Administrator' : u.role.replace('_', ' ')}
                              </Badge>
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                                 <Building2 className="h-3 w-3" />
                                 {allHospitals.find((h: any) => h.id === u.hospitalId)?.name || (
                                   <span className="text-red-400">Not Assigned</span>
                                 )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                             {u.isActive ? (
                               <Badge className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                             ) : (
                               <Badge className="bg-slate-100 text-slate-400 border-slate-200">Inactive</Badge>
                             )}
                          </td>
                          <td className="px-6 py-4 text-right">
                             {assigningUser === u.id ? (
                               <div className="flex items-center justify-end gap-2">
                                  <select 
                                    className="text-[10px] border rounded p-1 bg-white"
                                    value={selectedHospital}
                                    onChange={(e) => setSelectedHospital(e.target.value)}
                                    title="Select Hospital"
                                    aria-label="Select Hospital for Assignment"
                                  >
                                    <option value="">Select Hospital...</option>
                                    {allHospitals.map((h: any) => (
                                      <option key={h.id} value={h.id}>{h.name}</option>
                                    ))}
                                  </select>
                                  <button 
                                    onClick={() => handleAssign(u.id)}
                                    disabled={isUpdating}
                                    className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                                    title="Confirm Assignment"
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                  </button>
                                  <button onClick={() => setAssigningUser(null)} className="p-1 bg-slate-200 rounded" title="Cancel">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                               </div>
                             ) : (
                               <button 
                                 onClick={() => setAssigningUser(u.id)}
                                 className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 ml-auto hover:underline"
                               >
                                 <LinkIcon className="h-3 w-3" /> Assign Hospital
                               </button>
                             )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="hospitals" className="p-0">
                 <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                     <thead className="bg-muted/30 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                       <tr>
                         <th className="px-6 py-4">Hospital Name</th>
                         <th className="px-6 py-4">Location</th>
                         <th className="px-6 py-4 text-center">Staff Count</th>
                         <th className="px-6 py-4 text-right">Action</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-border/50">
                       {allHospitals.map((h: any) => (
                         <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                 <div className="p-2 bg-indigo-50 rounded-lg">
                                    <Building2 className="h-4 w-4 text-indigo-600" />
                                 </div>
                                 <div className="flex flex-col">
                                    <span className="text-sm font-bold">{h.name}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{h.code}</span>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex flex-col gap-0.5">
                                 <span className="text-xs font-medium flex items-center gap-1"><MapPin className="h-3 w-3" /> {h.city}</span>
                                 <span className="text-[10px] text-muted-foreground">{h.region}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4 text-center font-bold text-sm">
                              {allUsers.filter((u: any) => u.hospitalId === h.id).length}
                           </td>
                           <td className="px-6 py-4 text-right">
                              <button className="p-2 hover:bg-slate-100 rounded-lg" title="Manage Hospital">
                                 <MoreVertical className="h-4 w-4" />
                              </button>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-xl bg-white/60 backdrop-blur-md">
            <CardHeader className="pb-0">
              <CardTitle className="text-lg">Stats Overview</CardTitle>
            </CardHeader>
            <CardContent className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={userCounts} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="count" nameKey="role">
                    {userCounts.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" align="center" formatter={(val) => <span className="text-[10px] text-muted-foreground uppercase font-bold">{val.replace('_', ' ')}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-indigo-100 text-indigo-900">
             <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                   <div className="p-2 bg-indigo-200 rounded-lg"><AlertCircle className="h-5 w-5" /></div>
                   <h3 className="font-black text-sm uppercase tracking-widest">Missing Assignees</h3>
                </div>
                <p className="text-xs font-bold text-indigo-700 leading-relaxed mb-4">
                   Found {allUsers.filter((u: any) => !u.hospitalId && u.role === 'hospital_staff').length} staff member(s) not yet linked to an institution. Use the "Assign" tool to fix this.
                </p>
                <div className="h-1 w-full bg-indigo-200 rounded-full overflow-hidden">
                   <div className="h-full bg-indigo-600" style={{ width: `${(allUsers.filter((u: any) => u.hospitalId).length / allUsers.length) * 100}%` }} />
                </div>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
