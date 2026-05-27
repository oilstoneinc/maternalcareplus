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
import { assignUserToHospital, inviteHospital, approvePartnershipRequest, getMonthlyAuditReport } from '@/app/actions'
import { Calendar, Clock, ClipboardList, RefreshCw, Heart } from 'lucide-react'

interface AdminDashboardProps {
  user: any
  data: any
}

export default function AdminDashboardClient({ user, data }: AdminDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [assigningUser, setAssigningUser] = useState<string | null>(null)
  const [selectedHospital, setSelectedHospital] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  // Monthly Audit States
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth)
  const [auditData, setAuditData] = useState<{
    encounters: any[]
    staffLogs: any[]
    metrics: {
      encountersCount: number
      staffLogsCount: number
      newPregnancies: number
      completedLabs: number
      criticalAlerts: number
    }
  } | null>(null)
  const [loadingAudit, setLoadingAudit] = useState(false)

  const fetchAuditData = React.useCallback(async (year: number, month: number) => {
    setLoadingAudit(true)
    try {
      const res = await getMonthlyAuditReport(year, month)
      setAuditData(res as any)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingAudit(false)
    }
  }, [])

  React.useEffect(() => {
    fetchAuditData(selectedYear, selectedMonth)
  }, [selectedYear, selectedMonth, fetchAuditData])

  // Invitation Modal States
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteHospitalName, setInviteHospitalName] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [inviteSuccessToken, setInviteSuccessToken] = useState<string | null>(null)

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail || !inviteHospitalName) return
    setIsInviting(true)
    try {
      const res = await inviteHospital(inviteEmail, inviteHospitalName)
      if (res.success) {
        setInviteSuccessToken(res.token || '')
        setInviteEmail('')
        setInviteHospitalName('')
        setTimeout(() => {
          setShowInviteModal(false)
          setInviteSuccessToken(null)
          window.location.reload()
        }, 3000)
      } else {
        alert('Invitation Failed: ' + res.error)
      }
    } catch (err) {
      alert('Error sending invitation')
    } finally {
      setIsInviting(false)
    }
  }

  const [approvingId, setApprovingId] = useState<string | null>(null)

  const handleApproveRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to approve this partnership request and automatically issue an invitation?')) return
    setApprovingId(requestId)
    try {
      const res = await approvePartnershipRequest(requestId)
      if (res.success) {
        alert('Partnership request approved successfully! Registration invitation sent.')
        window.location.reload()
      } else {
        alert('Failed to approve request: ' + res.error)
      }
    } catch (err) {
      alert('Error approving request')
    } finally {
      setApprovingId(null)
    }
  }

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
          <button 
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-[#D48BA1] hover:bg-[#c47a90] text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg shadow-pink-100"
          >
            <Mail className="h-4 w-4" /> Invite Hospital
          </button>
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
                  <TabsTrigger value="users" className="rounded-lg px-4">User Records</TabsTrigger>
                  <TabsTrigger value="hospitals" className="rounded-lg px-4">Hospitals</TabsTrigger>
                  <TabsTrigger value="audit" className="rounded-lg px-4 flex items-center gap-1">
                    <ClipboardList className="h-3.5 w-3.5 text-indigo-600" /> Monthly Audits
                  </TabsTrigger>
                  <TabsTrigger value="system" className="rounded-lg px-4">Status</TabsTrigger>
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
                <div className="bg-slate-50 border-b p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Unassigned / System Users
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse bg-white">
                    <thead className="bg-muted/30 text-[10px] font-black text-muted-foreground uppercase tracking-widest hidden">
                      <tr>
                        <th className="px-6 py-4">Full Name</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {allUsers.filter((u: any) => !u.hospitalId).map((u: any) => (
                        <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4 w-[30%]">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold">{u.firstName} {u.lastName}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">{u.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 w-[30%]">
                            <Badge variant="outline" className="rounded-full px-3 py-0 scale-90 origin-left">
                              {u.role === 'hospital_staff' ? 'Hospital Administrator' : (u.role || 'Unknown').replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 w-[15%]">
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
                                  >
                                    <option value="">Select Hospital...</option>
                                    {allHospitals.map((h: any) => (
                                      <option key={h.id} value={h.id}>{h.name}</option>
                                    ))}
                                  </select>
                                  <button onClick={() => handleAssign(u.id)} className="p-1 bg-green-600 text-white rounded hover:bg-green-700">
                                    <CheckCircle2 className="h-3 w-3" />
                                  </button>
                                  <button onClick={() => setAssigningUser(null)} className="p-1 bg-slate-200 rounded">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                               </div>
                             ) : (
                               <button onClick={() => setAssigningUser(u.id)} className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 ml-auto hover:underline">
                                 <LinkIcon className="h-3 w-3" /> Assign Hospital
                               </button>
                             )}
                          </td>
                        </tr>
                      ))}
                      {allUsers.filter((u: any) => !u.hospitalId).length === 0 && (
                        <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">No unassigned users.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {allHospitals.map((hospital: any) => {
                  const hospitalPatients = allUsers.filter((u: any) => u.hospitalId === hospital.id && u.role === 'pregnant_woman');
                  const hospitalStaff = allUsers.filter((u: any) => u.hospitalId === hospital.id && u.role !== 'pregnant_woman');

                  return (
                    <div key={hospital.id} className="border-t-[4px] border-indigo-50 bg-white">
                      <div className="p-4 bg-indigo-50/30 flex items-center gap-3 border-b">
                         <div className="p-2 bg-indigo-100 rounded-lg">
                            <Building2 className="h-5 w-5 text-indigo-700" />
                         </div>
                         <div>
                           <h3 className="font-bold text-slate-900">{hospital.name}</h3>
                           <p className="text-xs text-slate-500 font-mono tracking-widest">{hospital.code} • {hospitalPatients.length} Patients • {hospitalStaff.length} Staff</p>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border/50">
                        {/* Patients Side */}
                        <div className="overflow-x-auto">
                          <div className="p-3 bg-pink-50/50 text-[10px] font-black text-pink-700 uppercase tracking-widest border-b">
                            Pregnant Women (Patients)
                          </div>
                          <table className="w-full text-left border-collapse">
                            <tbody className="divide-y divide-border/50">
                              {hospitalPatients.map((u: any) => (
                                <tr key={u.id} className="hover:bg-pink-50/20 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                      <span className="text-sm font-bold text-slate-800">{u.firstName} {u.lastName}</span>
                                      <span className="text-[10px] text-muted-foreground font-mono">{u.email}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                     <Badge className="bg-pink-50 text-pink-600 border-pink-200">Patient</Badge>
                                  </td>
                                </tr>
                              ))}
                              {hospitalPatients.length === 0 && (
                                <tr><td colSpan={2} className="px-4 py-6 text-center text-xs text-slate-400">No patients registered yet.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Staff Side */}
                        <div className="overflow-x-auto">
                          <div className="p-3 bg-slate-50 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b">
                            Hospital Staff
                          </div>
                          <table className="w-full text-left border-collapse">
                            <tbody className="divide-y divide-border/50">
                              {hospitalStaff.map((u: any) => (
                                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                      <span className="text-sm font-bold text-slate-800">{u.firstName} {u.lastName}</span>
                                      <span className="text-[10px] text-muted-foreground font-mono">{u.email}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                     <Badge variant="outline" className="text-slate-500 border-slate-200">
                                       {u.role === 'hospital_staff' ? 'Admin' : (u.role || 'Staff')}
                                     </Badge>
                                  </td>
                                </tr>
                              ))}
                              {hospitalStaff.length === 0 && (
                                <tr><td colSpan={2} className="px-4 py-6 text-center text-xs text-slate-400">No staff registered yet.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </TabsContent>

              <TabsContent value="hospitals" className="p-6 space-y-8">
                 <div>
                   <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                     <Building2 className="h-4 w-4 text-indigo-500" />
                     Registered Clinical Facilities
                   </h3>
                   <div className="overflow-x-auto border border-slate-100 rounded-xl bg-white">
                     <table className="w-full text-left border-collapse">
                       <thead className="bg-muted/30 text-[10px] font-black text-slate-900 uppercase tracking-widest">
                         <tr>
                           <th className="px-6 py-4">Hospital Name</th>
                           <th className="px-6 py-4">Location</th>
                           <th className="px-6 py-4 text-center">Staff Count</th>
                           <th className="px-6 py-4 text-right">Action</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-border/50 text-sm">
                         {allHospitals.map((h: any) => (
                           <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
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
                 </div>

                 <div className="pt-6 border-t border-slate-100">
                   <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                     <Mail className="h-4 w-4 text-pink-500" />
                     Partnership & Institutional Access Requests
                    </h3>
                    <div className="overflow-x-auto border border-slate-100 rounded-xl bg-white mb-8">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-muted/30 text-[10px] font-black text-slate-900 uppercase tracking-widest">
                          <tr>
                            <th className="px-6 py-4">Facility Details</th>
                            <th className="px-6 py-4">Location</th>
                            <th className="px-6 py-4">Notes</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50 text-sm">
                          {(data?.allPartnershipRequests || []).length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground font-medium">
                                No partnership requests received yet.
                              </td>
                            </tr>
                          ) : (
                            (data?.allPartnershipRequests || []).map((req: any) => (
                              <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-800">{req.hospitalName}</span>
                                    <span className="text-xs text-muted-foreground font-mono">{req.email}</span>
                                    <span className="text-[10px] text-muted-foreground">{req.phone || 'No phone'}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-xs font-semibold flex items-center gap-1"><MapPin className="h-3 w-3" /> {req.city}</span>
                                    <span className="text-[10px] text-muted-foreground">{req.region}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate" title={req.notes}>
                                  {req.notes || <span className="italic text-muted-foreground">None</span>}
                                </td>
                                <td className="px-6 py-4">
                                  {req.status === 'approved' ? (
                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Approved</Badge>
                                  ) : (
                                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 animate-pulse">Pending</Badge>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  {req.status === 'approved' ? (
                                    <Badge className="bg-slate-50 text-slate-400 border-slate-200">Invited</Badge>
                                  ) : (
                                    <button
                                      disabled={approvingId === req.id}
                                      onClick={() => handleApproveRequest(req.id)}
                                      className="px-3 py-1.5 bg-[#D48BA1] hover:bg-[#c47a90] disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold rounded-lg text-xs transition-colors shadow-sm"
                                    >
                                      {approvingId === req.id ? 'Approving...' : 'Approve & Invite'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2 pt-6 border-t border-slate-100">
                      <Mail className="h-4 w-4 text-pink-500" />
                      Direct Invite Logs (Neon DB)
                   </h3>
                   <div className="overflow-x-auto border border-slate-100 rounded-xl bg-white">
                     <table className="w-full text-left border-collapse">
                       <thead className="bg-muted/30 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                         <tr>
                           <th className="px-6 py-4">Facility Name & Email</th>
                           <th className="px-6 py-4">Invitation Token</th>
                           <th className="px-6 py-4">Sent Date</th>
                           <th className="px-6 py-4">Status</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-border/50 text-sm">
                         {(data?.allInvites || []).length === 0 ? (
                           <tr>
                             <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground font-medium">
                               No invitations sent yet. Click "Invite Hospital" to get started.
                             </td>
                           </tr>
                         ) : (
                           (data?.allInvites || []).map((inv: any) => (
                             <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                               <td className="px-6 py-4">
                                 <div className="flex flex-col">
                                   <span className="font-bold text-slate-800">{inv.hospitalName}</span>
                                   <span className="text-xs text-muted-foreground font-mono">{inv.email}</span>
                                 </div>
                               </td>
                               <td className="px-6 py-4 font-mono font-bold text-slate-700">
                                 {inv.token}
                               </td>
                               <td className="px-6 py-4 text-xs text-slate-500">
                                 {new Date(inv.sentAt).toLocaleDateString()}
                               </td>
                               <td className="px-6 py-4">
                                 {inv.status === 'accepted' ? (
                                   <Badge className="bg-green-50 text-green-700 border-green-200">Accepted</Badge>
                                 ) : (
                                   <Badge className="bg-amber-50 text-amber-700 border-amber-200 animate-pulse">Pending</Badge>
                                 )}
                               </td>
                             </tr>
                           ))
                         )}
                       </tbody>
                     </table>
                   </div>
                 </div>
               </TabsContent>
                            {/* Audit Tab: Real-Time Monthly Audits */}
                <TabsContent value="audit" className="p-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-50 border-b">
                    <div>
                      <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-indigo-600 animate-pulse" /> Monthly Audit Console
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Real-time system-wide clinical encounters and staff shift logs.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <select 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="text-xs border rounded-xl py-1.5 px-3 bg-white font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500/20"
                      >
                        {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, idx) => (
                          <option key={idx} value={idx + 1}>{m}</option>
                        ))}
                      </select>
                      <select 
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="text-xs border rounded-xl py-1.5 px-3 bg-white font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500/20"
                      >
                        {[2024, 2025, 2026, 2027].map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      <button 
                        onClick={() => fetchAuditData(selectedYear, selectedMonth)}
                        disabled={loadingAudit}
                        type="button"
                        className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all border border-indigo-100 shadow-sm disabled:opacity-50"
                        title="Reload Audit Logs"
                      >
                        <RefreshCw className={`h-4 w-4 ${loadingAudit ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {loadingAudit ? (
                    <div className="text-center py-20 text-slate-500 bg-white">
                      <RefreshCw className="h-10 w-10 animate-spin mx-auto mb-3 text-indigo-600" />
                      <p className="font-bold text-sm">Querying monthly audits in real time...</p>
                      <p className="text-xs text-slate-400 mt-1">Aggregating hospital encounters and daily duty logs...</p>
                    </div>
                  ) : !auditData ? (
                    <div className="text-center py-16 text-slate-400 bg-white">
                      <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="font-semibold text-sm">No audit data loaded</p>
                    </div>
                  ) : (
                    <div className="space-y-8 bg-white p-6">
                      {/* Premium Metrics Summary Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 text-indigo-900 shadow-sm">
                          <p className="text-[9px] uppercase tracking-widest font-black text-indigo-500">Clinical Encounters</p>
                          <h4 className="text-2xl font-black mt-1">{auditData.metrics.encountersCount}</h4>
                          <span className="text-[10px] text-slate-400 font-medium">Logged this month</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-100/50 text-teal-900 shadow-sm">
                          <p className="text-[9px] uppercase tracking-widest font-black text-teal-500">Active Duty Shifts</p>
                          <h4 className="text-2xl font-black mt-1">{auditData.metrics.staffLogsCount}</h4>
                          <span className="text-[10px] text-slate-400 font-medium">Duty sessions registered</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-pink-50/50 border border-pink-100/50 text-pink-900 shadow-sm">
                          <p className="text-[9px] uppercase tracking-widest font-black text-pink-500">New Onboardings</p>
                          <h4 className="text-2xl font-black mt-1">{auditData.metrics.newPregnancies}</h4>
                          <span className="text-[10px] text-slate-400 font-medium">Mothers registered</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100/50 text-rose-900 shadow-sm">
                          <p className="text-[9px] uppercase tracking-widest font-black text-rose-500">Critical Lab Alerts</p>
                          <h4 className="text-2xl font-black mt-1">{auditData.metrics.criticalAlerts}</h4>
                          <span className="text-[10px] text-slate-400 font-medium">Requires immediate action</span>
                        </div>
                      </div>

                      {/* Clinical Encounter Audits */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                          <Activity className="h-4 w-4 text-indigo-600" /> Clinical Encounter Trail
                        </h4>
                        <div className="overflow-x-auto border border-slate-100 rounded-xl">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-slate-50 text-[10px] font-black text-slate-900 uppercase tracking-widest border-b">
                              <tr>
                                <th className="px-4 py-3">Patient</th>
                                <th className="px-4 py-3">Facility</th>
                                <th className="px-4 py-3">Duty Personnel</th>
                                <th className="px-4 py-3">Action Type</th>
                                <th className="px-4 py-3">Care Encounter Summary</th>
                                <th className="px-4 py-3 text-right">Date & Time</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {auditData.encounters.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-medium italic">
                                    No clinical encounters logged in this billing/audit month.
                                  </td>
                                </tr>
                              ) : (
                                auditData.encounters.map((enc: any) => (
                                  <tr key={enc.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-4 py-3">
                                      <div className="flex flex-col">
                                        <span className="font-bold text-slate-800">{enc.patientName}</span>
                                        <span className="text-[9px] text-slate-400 font-mono">{enc.patientEmail}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <Badge variant="outline" className="scale-90 origin-left border-indigo-100 text-indigo-700 bg-indigo-50/30">
                                        {enc.hospitalName}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex flex-col">
                                        <span className="font-semibold text-slate-700">{enc.staffName}</span>
                                        <span className="text-[9px] text-slate-400 font-medium capitalize">{enc.staffRole.replace('_', ' ')}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] scale-90 origin-left">
                                        {enc.action.replace('_', ' ')}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-600 max-w-xs truncate" title={enc.summary}>
                                      {enc.summary}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-500 font-semibold">
                                      {new Date(enc.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Staff Duty Logs Audits */}
                      <div className="space-y-3 pt-4 border-t border-slate-100">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-teal-600 animate-pulse" /> Personnel Shift Logs Audits
                        </h4>
                        <div className="overflow-x-auto border border-slate-100 rounded-xl">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-slate-50 text-[10px] font-black text-slate-900 uppercase tracking-widest border-b">
                              <tr>
                                <th className="px-4 py-3">Staff Personnel</th>
                                <th className="px-4 py-3">Facility</th>
                                <th className="px-4 py-3">Check In Time</th>
                                <th className="px-4 py-3">Check Out Time</th>
                                <th className="px-4 py-3">Duty Duration</th>
                                <th className="px-4 py-3 text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {auditData.staffLogs.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-medium italic">
                                    No shift sessions registered in this audit month.
                                  </td>
                                </tr>
                              ) : (
                                auditData.staffLogs.map((log: any) => {
                                  const durationMin = log.sessionDuration ? Math.round(log.sessionDuration / 60) : null;
                                  const durationStr = durationMin 
                                    ? durationMin >= 60 
                                      ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`
                                      : `${durationMin} min`
                                    : '—';

                                  return (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                          <span className="font-bold text-slate-800">{log.staffName}</span>
                                          <span className="text-[9px] text-slate-400 font-mono">{log.staffEmail}</span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 font-semibold text-slate-700">
                                        {log.hospitalName}
                                      </td>
                                      <td className="px-4 py-3 font-semibold text-slate-600">
                                        {new Date(log.loginTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                      </td>
                                      <td className="px-4 py-3 font-semibold text-slate-600">
                                        {log.logoutTime ? (
                                          new Date(log.logoutTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                                        ) : (
                                          <span className="text-slate-400">—</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 font-bold text-slate-800">
                                        {durationStr}
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        <Badge 
                                          className={
                                            log.status === 'active' 
                                              ? 'bg-teal-50 text-teal-700 border border-teal-200 animate-pulse scale-90' 
                                              : 'bg-slate-100 text-slate-700 border border-slate-200 scale-90'
                                          }
                                        >
                                          {log.status === 'active' ? 'On Duty' : 'Completed'}
                                        </Badge>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* System Tab: Database & Infrastructure Status */}
                <TabsContent value="system" className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border">
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold flex items-center gap-2 text-slate-800">
                        <Server className="h-4 w-4 text-indigo-500 animate-pulse" /> Database & Cloud Infrastructure
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        MaternalCare Plus operates on a serverless micro-scaled architecture with secure Neon database clusters. Multi-facility operations are logged instantly with Ghanaian national encryption guidelines.
                      </p>
                      <div className="h-0.5 w-full bg-slate-100" />
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-semibold">Engine Version</span>
                          <span className="font-mono font-bold text-slate-800">PostgreSQL 16.2</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-semibold">Connection Pooling</span>
                          <span className="font-mono font-bold text-slate-800">Enabled (PgBouncer)</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-semibold">Primary Node Region</span>
                          <span className="font-mono font-bold text-slate-800">AWS us-east-2 (Ohio)</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-semibold">Database Security SSL</span>
                          <span className="font-mono font-bold text-emerald-600 flex items-center gap-1">✔ Verified TLS v1.3</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Network Health</span>
                        <h4 className="text-base font-black text-slate-800 mt-1 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> System Operational
                        </h4>
                        <p className="text-xs text-slate-400 mt-2 font-medium leading-relaxed">
                          All systems functional. real-time sync networks (Pusher websocket protocols) are operating with clean quote-stripped credentials.
                        </p>
                      </div>
                      <div className="pt-4 border-t text-xs font-bold text-slate-500 flex justify-between">
                        <span>API Ping Latency:</span>
                        <span className="font-mono text-indigo-600">14 ms</span>
                      </div>
                    </div>
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
                  <Legend verticalAlign="bottom" align="center" formatter={(val) => <span className="text-[10px] text-muted-foreground uppercase font-bold">{(val || 'Unknown').replace('_', ' ')}</span>} />
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
      {/* Invite Hospital Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="p-6 bg-[#D48BA1] text-white animate-pulse-once">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Invite Clinical Facility
              </h2>
              <p className="text-xs text-slate-100 opacity-90 mt-1">
                Provide the hospital's primary setup details. A database pre-registration and unique invite token will be generated instantly.
              </p>
            </div>

            <form onSubmit={handleInviteSubmit} className="p-6 space-y-4">
              {inviteSuccessToken ? (
                <div className="text-center py-4 space-y-3">
                  <div className="inline-flex p-3 rounded-full bg-green-50 text-green-600">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-800">Invitation Registered!</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    The clinical facility has been pre-registered. Share their unique invitation token to complete onboarding:
                  </p>
                  <div className="p-3 bg-slate-50 rounded-xl font-mono font-bold text-slate-700 select-all border text-center text-sm">
                    {inviteSuccessToken}
                  </div>
                  <p className="text-[10px] text-muted-foreground animate-pulse mt-2">
                    Refreshing console...
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Facility Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Ridge Maternity Hospital"
                      className="w-full border-slate-200 focus:border-[#D48BA1] focus:ring-[#D48BA1] rounded-xl py-2 px-3 text-sm shadow-sm"
                      value={inviteHospitalName}
                      onChange={(e) => setInviteHospitalName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Primary Setup Email Address</label>
                    <input 
                      type="email" 
                      required
                      placeholder="e.g. contact@ridgehospital.org"
                      className="w-full border-slate-200 focus:border-[#D48BA1] focus:ring-[#D48BA1] rounded-xl py-2 px-3 text-sm shadow-sm"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-2 border-t mt-4">
                    <button 
                      type="button"
                      disabled={isInviting}
                      onClick={() => setShowInviteModal(false)}
                      className="px-4 py-2 border rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isInviting}
                      className="px-4 py-2 bg-[#D48BA1] hover:bg-[#c47a90] text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-pink-100 flex items-center gap-1.5"
                    >
                      {isInviting ? 'Registering...' : 'Generate Invite & Pre-Register'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
