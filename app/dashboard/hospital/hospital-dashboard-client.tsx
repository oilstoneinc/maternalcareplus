'use client'

import { useState, useEffect } from 'react'
import { User } from '@clerk/nextjs/server'
import { useClerk } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { searchGlobalPatients, scheduleNextVisit, assignMidwifeToPregnancy, addHospitalStaffMember, exportHospitalPatientsCsv, removeHospitalStaffMember, getHospitalStaffLoginHistory, generateHospitalShiftCode, getHospitalMessageThreads, forceSignOutStaffSession } from '@/app/actions'
import SessionTimeoutGuard from '@/components/SessionTimeoutGuard'
import ShiftCodeGate from '@/components/ShiftCodeGate'
import FloatingChatWindow from '@/components/dashboard/FloatingChatWindow'
import { pusherClient, pusherEnabled } from '@/lib/pusher-client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Calendar, 
  Baby, 
  Phone,
  MessageCircle,
  Plus, 
  Search,
  Filter,
  Download,
  TrendingUp,
  AlertTriangle,
  HeartPulse,
  UserCog,
  Trash2,
  ShieldAlert,
  Clock,
  Lock,
  RefreshCw,
  LogOut,
  CheckCircle2,
  Activity,
} from 'lucide-react'

interface Pregnancy {
  id: string
  patientUserId: string
  patientName: string
  patientPhone?: string | null
  patientEmail?: string | null
  gestationalAge: number
  edd: string
  lastVisit: string
  nextVisit: string
  nextVisitDate?: string | Date | null
  nextVisitId?: string | null
  assignedStaffId?: string | null
  assignedStaffName?: string | null
  riskLevel: 'low' | 'medium' | 'high'
  status: 'active' | 'completed' | 'complicated'
}

interface Patient {
  id: string
  name: string
  email: string
  phone: string
  pregnancies: number
  status: 'active' | 'inactive'
  lastVisit: string
  /** Active pregnancy record — used for /dashboard/hospital/patients/[id] */
  pregnancyId?: string | null
}

export default function HospitalDashboardClient({ user, data }: { user: any, data: any }) {
  const router = useRouter()
  const { signOut } = useClerk()
  const [activeTab, setActiveTab] = useState('overview')
  const [loginLogs, setLoginLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [isSigningOutStaff, setIsSigningOutStaff] = useState<string | null>(null)
  const [openChats, setOpenChats] = useState<Array<{ id: string; name: string }>>([]) 
  const [threads, setThreads] = useState<any[]>(data?.messageThreads || [])

  const handleForceSignOut = async (logId: string) => {
    if (!confirm("Are you sure you want to end this staff member's shift? They will be signed out and required to re-verify their shift code for any future clinical actions.")) {
      return
    }
    setIsSigningOutStaff(logId)
    try {
      const res = await forceSignOutStaffSession(logId)
      if (res.success) {
        // Refresh security logs
        const freshLogs = await getHospitalStaffLoginHistory()
        setLoginLogs(freshLogs)
      } else {
        alert(res.error || 'Failed to sign out staff')
      }
    } catch (err) {
      console.error(err)
      alert('Error signing out staff')
    } finally {
      setIsSigningOutStaff(null)
    }
  }

  useEffect(() => {
    if (data?.messageThreads) {
      setThreads(data.messageThreads)
    }
  }, [data?.messageThreads])

  const openFloatingChat = (patientUserId: string, patientName: string) => {
    setOpenChats(prev => {
      if (prev.some(c => c.id === patientUserId)) return prev
      return [...prev, { id: patientUserId, name: patientName }]
    })
    setThreads(prev => prev.map(t => 
      t.patientUserId === patientUserId ? { ...t, unreadCount: 0 } : t
    ))
  }

  useEffect(() => {
    const userId = data?.dbUser?.id
    if (!userId || !pusherEnabled) {
      return
    }

    const channelName = `chat-${userId}`
    const channel = pusherClient.subscribe(channelName)

    const onNewMessage = (msg: any) => {
      setThreads((prev) => {
        const patientId = msg.senderId === userId ? msg.receiverId : msg.senderId
        const patientObj = data?.patients?.find((p: any) => p.id === patientId)
        const patientName = patientObj 
          ? `${patientObj.firstName} ${patientObj.lastName}`.trim() 
          : 'Patient'

        const existingIdx = prev.findIndex((t) => t.patientUserId === patientId)
        const isChatOpen = openChats.some((c) => c.id === patientId)

        if (existingIdx > -1) {
          const updated = [...prev]
          updated[existingIdx] = {
            ...updated[existingIdx],
            lastMessage: msg.content,
            lastMessageAt: msg.createdAt,
            unreadCount: isChatOpen ? 0 : (updated[existingIdx].unreadCount || 0) + (msg.senderId !== userId ? 1 : 0),
          }
          const item = updated.splice(existingIdx, 1)[0]
          return [item, ...updated]
        } else {
          return [{
            patientUserId: patientId,
            patientName,
            lastMessage: msg.content,
            lastMessageAt: msg.createdAt,
            unreadCount: isChatOpen ? 0 : (msg.senderId !== userId ? 1 : 0),
            assignedStaffName: null
          }, ...prev]
        }
      })
    }

    channel.bind('new-message', onNewMessage)

    return () => {
      channel.unbind('new-message', onNewMessage)
      pusherClient.unsubscribe(channelName)
    }
  }, [data?.dbUser?.id, data?.patients, openChats])

  useEffect(() => {
    let cancelled = false
    const pollThreads = async () => {
      try {
        const freshThreads = await getHospitalMessageThreads()
        if (!cancelled && freshThreads) {
          setThreads((prev) => {
            // Compare lengths and values to prevent unnecessary state triggers
            if (prev.length === freshThreads.length && JSON.stringify(prev) === JSON.stringify(freshThreads)) {
              return prev
            }
            return freshThreads
          })
        }
      } catch (err) {
        console.error('Polling hospital threads failed:', err)
      }
    }

    const interval = setInterval(pollThreads, 10000) // Poll thread metadata every 10 seconds

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'staff') {
      setLoadingLogs(true)
      getHospitalStaffLoginHistory()
        .then(setLoginLogs)
        .catch(console.error)
        .finally(() => setLoadingLogs(false))
    }
  }, [activeTab])

  // Confirm Dialog State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    onConfirm: () => void | Promise<void>;
    confirmBtnClass?: string;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: 'Confirm',
    onConfirm: () => {},
  })

  // Alert Dialog State (replaces standard window.alert)
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    type: 'success' | 'error' | 'info';
  }>({
    isOpen: false,
    title: '',
    description: '',
    type: 'info',
  })

  const handleDeleteStaff = (staffId: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Remove Staff Member',
      description: 'Are you sure you want to remove this staff member from your facility? This will revoke their Clerk login access immediately.',
      confirmText: 'Yes, Remove Staff',
      confirmBtnClass: 'bg-rose-600 hover:bg-rose-700 text-white',
      onConfirm: async () => {
        try {
          const res = await removeHospitalStaffMember(staffId)
          if (res.success) {
            setAlertState({
              isOpen: true,
              title: 'Staff Removed',
              description: 'The staff member has been removed successfully.',
              type: 'success'
            })
            router.refresh()
          } else {
            setAlertState({
              isOpen: true,
              title: 'Error',
              description: res.error || 'Failed to remove staff member',
              type: 'error'
            })
          }
        } catch (err) {
          console.error(err)
          setAlertState({
            isOpen: true,
            title: 'Error',
            description: 'An error occurred while removing the staff member.',
            type: 'error'
          })
        }
      }
    })
  }
  const careStaff: { id: string; firstName: string; lastName: string; role: string }[] =
    data?.careStaff || []
  const facilityCareHistory: any[] = data?.facilityCareHistory || []
  const upcomingAppointments: any[] = data?.upcomingAppointments || []

  // Permission flags — only the main hospital account owner (email matches hospital contact) or a super-admin
  // can add/remove staff or export data. All clinical staff share the same dashboard view.
  const isSuperAdmin = data?.dbUser?.role === 'admin'
  const isMainHospitalAccount =
    data?.dbUser?.email &&
    data?.hospital?.email &&
    data.dbUser.email.toLowerCase() === data.hospital.email.toLowerCase()
  const canManageStaff = isSuperAdmin || isMainHospitalAccount
  const canExportData = isSuperAdmin || isMainHospitalAccount

  const formatDate = (date: any) => {
    if (!date) return 'N/A'
    try {
      return new Date(date).toLocaleDateString()
    } catch (e) {
      return 'N/A'
    }
  }

  const mapPatientRow = (p: any, pregnancyList: any[]): Patient => {
    const preg = (pregnancyList || []).find(
      (pr) => (pr.patientUserId || pr.userId) === p.id
    )
    return {
      id: p.id,
      name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email || 'Anonymous',
      email: p.email,
      phone: p.phone,
      pregnancies: preg ? 1 : 0,
      status: p.isActive ? 'active' : 'inactive',
      lastVisit: formatDate(p.updatedAt),
      pregnancyId: preg?.id ?? null,
    }
  }

  const [patients, setPatients] = useState<Patient[]>(
    data?.patients?.map((p: any) => mapPatientRow(p, data?.pregnancies)) || []
  )
  
  const mapPregnancies = (list: any[]): Pregnancy[] =>
    (list || []).map((p: any) => ({
      id: p.id,
      patientUserId: p.patientUserId || p.userId,
      patientName: p.patientName || 'Unknown Patient',
      patientPhone: p.patientPhone,
      gestationalAge: p.gestationalAge || 0,
      edd: formatDate(p.edd),
      lastVisit: 'N/A',
      nextVisit: p.nextVisit || 'Not scheduled',
      nextVisitDate: p.nextVisitDate,
      assignedStaffId: p.assignedStaffId ?? p.midwifeId,
      assignedStaffName: p.assignedStaffName,
      riskLevel: p.riskLevel || 'low',
      status: p.status,
    }))

  const [pregnancies, setPregnancies] = useState<Pregnancy[]>(mapPregnancies(data?.pregnancies))
  const [searchTerm, setSearchTerm] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [staffSaving, setStaffSaving] = useState(false)
  const [staffForm, setStaffForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'midwife' as 'midwife' | 'hospital_staff',
  })

  // National Patient Registry Search states
  const [globalSearchTerm, setGlobalSearchTerm] = useState('')
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([])
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false)
  const [hasSearchedGlobal, setHasSearchedGlobal] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleGlobalSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = globalSearchTerm.trim()
    if (q.length < 2) {
      alert('Enter at least 2 characters (name, phone, email, or ID).')
      return
    }
    setIsSearchingGlobal(true)
    setHasSearchedGlobal(true)
    try {
      const results = await searchGlobalPatients(globalSearchTerm)
      setGlobalSearchResults(results || [])
    } catch (err) {
      console.error(err)
      alert('Error searching national patient registry')
    } finally {
      setIsSearchingGlobal(false)
    }
  }

  useEffect(() => {
    const pregnancyList = data?.pregnancies || []
    if (data?.patients) {
      setPatients(data.patients.map((p: any) => mapPatientRow(p, pregnancyList)))
    }
    if (data?.pregnancies) {
      setPregnancies(mapPregnancies(data.pregnancies))
    }
  }, [data])

  const upcomingAppointmentsList = data?.upcomingAppointments || []

  const stats = {
    totalPatients: patients.length,
    activePregnancies: pregnancies.filter((p) => p.status === 'active').length,
    highRiskPregnancies: pregnancies.filter((p) => p.riskLevel === 'high').length,
    upcomingAppointments: upcomingAppointmentsList.length,
  }

  const refreshDashboard = () => router.refresh()

  const handleExportData = async () => {
    setExporting(true)
    try {
      const res = await exportHospitalPatientsCsv()
      if (res.success && res.csv) {
        const blob = new Blob([`\uFEFF${res.csv}`], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = res.filename || 'patients-export.csv'
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
      } else {
        alert(res.error || 'Could not export data')
      }
    } catch (err) {
      console.error(err)
      alert('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!staffForm.firstName.trim() || !staffForm.lastName.trim() || !staffForm.email.trim()) {
      alert('First name, last name, and email are required.')
      return
    }
    setStaffSaving(true)
    try {
      const res = await addHospitalStaffMember(staffForm)
      if (res.success) {
        alert('Staff member added. They will receive an email invitation to join.')
        setShowAddStaff(false)
        setStaffForm({ firstName: '', lastName: '', email: '', phone: '', role: 'midwife' })
        refreshDashboard()
      } else {
        alert(res.error || 'Could not add staff member')
      }
    } finally {
      setStaffSaving(false)
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const staffName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Staff'

  return (
    <SessionTimeoutGuard role="hospital_staff" staffName={staffName} sessionHours={8}>
    <ShiftCodeGate dbUser={data?.dbUser} hospital={data?.hospital}>
    <div className="min-h-screen bg-[#F6F4F3] p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-slate-100">
               <HeartPulse className="w-7 h-7 text-[#D48BA1]" />
            </div>
            <div>
              {data?.hospital?.name && (
                <div className="text-teal-600 font-extrabold text-xs tracking-wider uppercase flex items-center gap-1.5 mb-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-teal-500" />
                  {data.hospital.name}
                </div>
              )}
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">MaternalCare Plus</h1>
              <p className="text-slate-500 font-bold text-sm tracking-wide uppercase">Hospital Management Console</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
            <Button onClick={() => setShowOnboarding(true)} className="bg-[#D48BA1] hover:bg-[#c47a90] font-bold py-5 px-6 rounded-xl shadow-md transition-all">
              <Plus className="w-5 h-5 mr-2" />
              Onboard Patient
            </Button>
            {canManageStaff && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddStaff(true)}
                className="border-slate-200 text-slate-700 font-bold py-5 rounded-xl"
              >
                <UserCog className="w-4 h-4 mr-2" />
                Add Staff
              </Button>
            )}
            {canExportData && (
              <Button
                type="button"
                variant="outline"
                disabled={exporting}
                onClick={handleExportData}
                className="border-slate-200 text-slate-600 font-bold py-5 rounded-xl"
                title="Download CSV of patients at your facility only"
              >
                <Download className="w-4 h-4 mr-2" />
                {exporting ? 'Exporting…' : 'Export Data'}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => signOut(() => router.push('/sign-in'))}
              className="border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 font-bold py-5 rounded-xl"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Patients</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalPatients}</p>
                </div>
                <Users className="w-8 h-8 text-[#D48BA1]" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Pregnancies</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activePregnancies}</p>
                </div>
                <Baby className="w-8 h-8 text-[#D48BA1]" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">High Risk Cases</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.highRiskPregnancies}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Appointments</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.upcomingAppointments}</p>
                </div>
                <Calendar className="w-8 h-8 text-[#D48BA1]" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid w-full ${canManageStaff ? 'grid-cols-2 sm:grid-cols-6' : 'grid-cols-2 sm:grid-cols-5'}`}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="messages" className="relative">
              Messages
              {(threads || []).some((t: { unreadCount: number }) => t.unreadCount > 0) && (
                <span className="ml-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D48BA1] text-white text-[10px] font-bold inline-flex items-center justify-center">
                  {(threads || []).reduce(
                    (sum: number, t: { unreadCount: number }) => sum + (t.unreadCount || 0),
                    0
                  ) > 9
                    ? '9+'
                    : (threads || []).reduce(
                        (sum: number, t: { unreadCount: number }) => sum + (t.unreadCount || 0),
                        0
                      )}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="patients">Patients</TabsTrigger>
            <TabsTrigger value="pregnancies">Pregnancies</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            {canManageStaff && <TabsTrigger value="staff">Staff & Duty Logs</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Upcoming Appointments */}
            <Card className="border-slate-100 shadow-sm bg-white">
              <CardHeader className="bg-slate-50/50">
                <CardTitle className="text-slate-800 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#D48BA1]" />
                  Upcoming Appointments
                </CardTitle>
                <CardDescription>Next scheduled visits at this facility</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {upcomingAppointments.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-10 h-10 mx-auto mb-2 opacity-20 text-slate-400" />
                    <p className="text-sm text-slate-400 font-medium">No upcoming appointments.</p>
                    <p className="text-xs text-slate-300 mt-1">Scheduled visits will appear here automatically.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingAppointments.slice(0, 5).map((apt: any) => (
                      <div key={apt.id} className="flex items-start justify-between p-3 bg-slate-50/60 hover:bg-slate-50 rounded-xl border border-slate-100/70 transition-colors">
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-bold text-slate-800 text-sm truncate">{apt.patientName}</p>
                          <p className="text-xs text-teal-700 font-semibold mt-0.5">
                            {apt.scheduledDate ? new Date(apt.scheduledDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : 'Date TBD'}
                          </p>
                          {apt.notes && (
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[180px]">{apt.notes}</p>
                          )}
                        </div>
                        {apt.pregnancyId && (
                          <Link href={`/dashboard/hospital/patients/${apt.pregnancyId}`} className="shrink-0">
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs font-semibold rounded-lg border-slate-200">
                              View
                            </Button>
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Staff Activity Feed — visible to hospital owners only */}
            {canManageStaff && (
              <Card className="border-slate-100 shadow-sm bg-white">
                <CardHeader className="bg-slate-50/50">
                  <CardTitle className="text-slate-800 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-[#D48BA1]" />
                    Staff Activity Feed
                  </CardTitle>
                  <CardDescription>
                    Real-time log of every clinical entry saved by your staff across all patient records.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {facilityCareHistory.length === 0 ? (
                    <p className="text-sm text-slate-400 font-medium py-6 text-center">
                      No staff activity recorded yet. Entries will appear here as staff save clinical data.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {facilityCareHistory.slice(0, 20).map((entry: any) => (
                        <div key={entry.id} className="flex items-start gap-4 py-3.5 px-1">
                          <div className="w-9 h-9 rounded-full bg-[#D48BA1]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Activity className="w-4 h-4 text-[#D48BA1]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{entry.patientName}</p>
                            <p className="text-xs text-slate-500 font-medium">
                              <span className="text-teal-700 font-bold">{entry.actionLabel}</span>
                              {' — '}{entry.summary}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              by <span className="font-semibold text-slate-600">{entry.staffName || 'Unknown Staff'}</span>
                              {' · '}{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-[#D48BA1]" />
                  Patient messages
                </CardTitle>
                <CardDescription>
                  When a pregnant woman messages care team, conversations appear here. Assign a staff member on the patient profile so she knows who to contact.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(threads || []).length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No patient messages yet</p>
                    <p className="text-sm mt-1 max-w-md mx-auto">
                      Messages sent from the pregnant woman app go to her assigned midwife or staff. Open a patient and use Assign chat contact if messaging is disabled for her.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(threads || []).map((thread: {
                      patientUserId: string
                      patientName: string
                      pregnancyId: string
                      lastMessage: string
                      lastMessageAt: string
                      unreadCount: number
                      assignedStaffName: string | null
                    }) => (
                      <div
                        key={thread.patientUserId}
                        onClick={() => openFloatingChat(thread.patientUserId, thread.patientName)}
                        className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/80 hover:bg-white hover:shadow-sm transition-all cursor-pointer"
                      >
                        <div className="w-11 h-11 rounded-2xl bg-[#D48BA1]/15 flex items-center justify-center shrink-0 font-black text-[#D48BA1] text-sm">
                          {thread.patientName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-slate-900 truncate">{thread.patientName}</p>
                            <span className="text-[10px] text-slate-400 font-bold shrink-0">
                              {thread.lastMessageAt
                                ? new Date(thread.lastMessageAt).toLocaleString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : ''}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 truncate mt-0.5">{thread.lastMessage}</p>
                          {thread.assignedStaffName && (
                            <p className="text-[10px] text-slate-400 font-semibold mt-1">
                              Care contact: {thread.assignedStaffName}
                            </p>
                          )}
                        </div>
                        {thread.unreadCount > 0 && (
                          <Badge className="bg-[#D48BA1] text-white shrink-0">
                            {thread.unreadCount}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patients" className="space-y-6">
            {/* National Patient Registry Search Panel */}
            <Card className="border-[#D48BA1]/20 shadow-md bg-white">
              <CardHeader className="bg-slate-50/50 pb-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle className="text-slate-800 flex items-center gap-2">
                      <HeartPulse className="h-5 w-5 text-[#D48BA1]" />
                      National MCH Patient Registry Search
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-1">
                      Search across all hospitals nationally to locate a visiting mother's unified MCH record by Name, Phone, Email, or ID.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <form onSubmit={handleGlobalSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Name, phone, email, or patient ID…"
                      value={globalSearchTerm}
                      onChange={(e) => setGlobalSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 focus:border-[#D48BA1] focus:ring-1 focus:ring-[#D48BA1] rounded-xl text-sm shadow-sm"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isSearchingGlobal} 
                    className="bg-[#D48BA1] hover:bg-[#c47a90] text-white rounded-xl shadow-sm text-sm font-semibold"
                  >
                    {isSearchingGlobal ? 'Searching...' : 'Search National Registry'}
                  </Button>
                </form>

                {hasSearchedGlobal && (
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Registry Search Results</h4>
                    {globalSearchResults.length === 0 ? (
                      <p className="text-sm text-slate-500 font-medium py-2">
                        No patients found matching "{globalSearchTerm}" in the national database.
                      </p>
                    ) : (
                      <div className="overflow-x-auto border border-slate-100 rounded-xl bg-white">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-50 text-[10px] font-black text-slate-900 uppercase tracking-widest">
                            <tr className="border-b border-slate-100">
                              <th className="px-4 py-3">Patient Name</th>
                              <th className="px-4 py-3">Phone / Email</th>
                              <th className="px-4 py-3">Patient & ID</th>
                              <th className="px-4 py-3">Primary Onboarding Facility</th>
                              <th className="px-4 py-3">Care trail</th>
                              <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                            {globalSearchResults.map((res) => (
                              <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-800">{res.name}</span>
                                    {res.pregnancyStatus && res.pregnancyStatus !== 'active' && (
                                      <span className="text-[10px] text-amber-600 font-semibold">
                                        Pregnancy: {res.pregnancyStatus}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col text-xs text-slate-600">
                                    <span>{res.phone || '—'}</span>
                                    <span className="text-muted-foreground break-all">{res.email}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col text-[10px] font-mono text-slate-600 gap-0.5">
                                    {res.ghanaCardId && (
                                      <span className="font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100 mb-1 w-max">
                                        GH-Card: {res.ghanaCardId}
                                      </span>
                                    )}
                                    <span title={res.id}>Patient: {res.id.substring(0, 8)}…</span>
                                    <span title={res.clerkId || ''}>ID: {res.clerkId?.substring(0, 12) || res.id.substring(0, 8)}…</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-slate-700 text-xs">{res.onboardedHospitalName}</span>
                                    <span className="text-[10px] text-muted-foreground">{res.onboardedHospitalLocation}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-xs text-slate-600">
                                    {res.facilitiesInHistory > 0
                                      ? `${res.facilitiesInHistory} facilit${res.facilitiesInHistory === 1 ? 'y' : 'ies'}`
                                      : '—'}
                                  </span>
                                  {res.lastCareFacility && (
                                    <span className="block text-[10px] text-muted-foreground">
                                      Last: {res.lastCareFacility}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {res.pregnancyId ? (
                                    <Link href={`/dashboard/hospital/patients/${res.pregnancyId}`}>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="border-pink-200 text-[#D48BA1] hover:bg-pink-50 hover:text-[#c47a90] rounded-xl font-bold text-xs"
                                      >
                                        Retrieve History & Record ANC Visit
                                      </Button>
                                    </Link>
                                  ) : (
                                    <span className="text-xs text-slate-400">No pregnancy on file</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle>All Patients</CardTitle>
                    <CardDescription>Manage patient records and information</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Name, phone, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D48BA1] focus:border-transparent"
                      />
                    </div>
                    <Button variant="outline">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Name</th>
                        <th className="text-left p-3">Contact</th>
                        <th className="text-left p-3">Pregnancies</th>
                        <th className="text-left p-3">Last Visit</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patients
                        .filter(
                          (patient) =>
                            !searchTerm.trim() ||
                            patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            patient.phone?.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, '')) ||
                            patient.id?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((patient) => (
                        <tr key={patient.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{patient.name}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span>{patient.phone || '—'}</span>
                            </div>
                          </td>
                          <td className="p-3">{patient.pregnancies}</td>
                          <td className="p-3">{patient.lastVisit}</td>
                          <td className="p-3">
                            <Badge className={patient.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {patient.status}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {patient.pregnancyId ? (
                              <Link href={`/dashboard/hospital/patients/${patient.pregnancyId}`}>
                                <Button variant="outline" size="sm">
                                  View
                                </Button>
                              </Link>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                title="No active pregnancy on file"
                              >
                                View
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pregnancies" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Pregnancies</CardTitle>
                <CardDescription>Monitor ongoing pregnancies and risk factors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pregnancies.map((pregnancy) => (
                    <Card key={pregnancy.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-semibold text-slate-900">{pregnancy.patientName}</h3>
                          <Badge className={getRiskColor(pregnancy.riskLevel)}>
                            {pregnancy.riskLevel}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Gestational Age:</span>
                            <span className="font-medium">{pregnancy.gestationalAge} weeks</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">EDD:</span>
                            <span className="font-medium">{pregnancy.edd}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Next Visit:</span>
                            <span className="font-medium text-[#D48BA1]">{pregnancy.nextVisit}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Care contact:</span>
                            <span className="font-medium text-xs text-right max-w-[55%]">
                              {pregnancy.assignedStaffName || 'Not assigned'}
                            </span>
                          </div>
                        </div>
                        <PregnancyQuickActions
                          pregnancy={pregnancy}
                          careStaff={careStaff}
                          onUpdated={refreshDashboard}
                        />
                        <div className="mt-3 flex gap-2">
                          <Link href={`/dashboard/hospital/patients/${pregnancy.id}`} className="flex-1">
                            <Button size="sm" className="w-full bg-[#D48BA1] hover:bg-[#c47a90]">
                              View Details
                            </Button>
                          </Link>
                          {pregnancy.patientUserId && (
                            <Button
                              variant="outline" size="sm"
                              aria-label="Message patient" title="Open chat"
                              onClick={() => openFloatingChat(pregnancy.patientUserId, pregnancy.patientName)}
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Visits</CardTitle>
                <CardDescription>Scheduled antenatal appointments at your facility</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingAppointmentsList.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No upcoming appointments scheduled</p>
                    <p className="text-xs mt-2">Schedule visits from the Pregnancies tab</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingAppointmentsList.map((apt: any) => (
                      <div
                        key={apt.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{apt.patientName}</p>
                          <p className="text-sm text-slate-600">
                            {formatDate(apt.scheduledDate)}
                            {apt.notes ? ` · ${apt.notes}` : ''}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/dashboard/hospital/patients/${apt.pregnancyId}`}>
                            <Button size="sm" variant="outline">Profile</Button>
                          </Link>
                          {apt.patientUserId && (
                            <Button
                              size="sm" className="bg-slate-900"
                              onClick={() => openFloatingChat(apt.patientUserId, apt.patientName)}
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {canManageStaff && (
            <TabsContent value="staff" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left 2 Columns: Active Staff List & Action */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-slate-100 shadow-sm bg-white">
                  <CardHeader className="flex flex-row justify-between items-center bg-slate-50/50">
                    <div>
                      <CardTitle className="text-slate-800 flex items-center gap-2">
                        <Users className="h-5 w-5 text-[#D48BA1]" />
                        Active Hospital & Care Staff
                      </CardTitle>
                      <CardDescription>
                        {canManageStaff
                          ? 'Manage midwives, doctors, and nursing personnel linked to this facility.'
                          : 'Staff members currently active at this facility.'}
                      </CardDescription>
                    </div>
                    {canManageStaff && (
                      <Button
                        onClick={() => setShowAddStaff(true)}
                        size="sm"
                        className="bg-[#D48BA1] hover:bg-[#c47a90] font-bold text-white rounded-xl"
                      >
                        <Plus className="w-4 h-4 mr-1.5" /> Add Staff
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="pt-6">
                    {careStaff.length === 0 ? (
                      <p className="text-sm text-slate-500 font-medium py-4 text-center">
                        No care staff registered at this facility yet. Click "Add Staff" to invite active personnel.
                      </p>
                    ) : (
                      <div className="overflow-x-auto border border-slate-100 rounded-xl bg-white">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-50 text-[10px] font-black text-slate-900 uppercase tracking-widest">
                            <tr className="border-b border-slate-100">
                              <th className="px-4 py-3">Staff Name</th>
                              <th className="px-4 py-3">Role</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                            {careStaff.map((staff) => (
                              <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 font-bold text-slate-800">
                                  {staff.firstName} {staff.lastName}
                                </td>
                                <td className="px-4 py-3">
                                  <Badge variant="outline" className="capitalize text-slate-600 border-slate-200">
                                    {staff.role.replace('_', ' ')}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3">
                                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Active
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {canManageStaff ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteStaff(staff.id)}
                                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all"
                                    >
                                      <Trash2 className="h-4 w-4 mr-1.5" /> Remove
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-slate-400 font-medium">View only</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Duty & Login Audit Trail Table */}
                <Card className="border-slate-100 shadow-sm bg-white">
                  <CardHeader className="bg-slate-50/50">
                    <CardTitle className="text-slate-800 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-teal-600" />
                      Staff Duty & Login Audit History
                    </CardTitle>
                    <CardDescription>
                      Real-time clinical audit trail of all staff logins, shift code validations, and active duty time.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {loadingLogs ? (
                      <div className="text-center py-10 text-slate-500">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-teal-600" />
                        <p className="font-semibold text-sm">Loading security logs...</p>
                      </div>
                    ) : loginLogs.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
                        <p className="font-medium">No duty logs on record today</p>
                        <p className="text-xs mt-1">Logs are created automatically when staff verify their daily shift code.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-100 rounded-xl bg-white">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-50 text-[10px] font-black text-slate-900 uppercase tracking-widest">
                            <tr className="border-b border-slate-100">
                              <th className="px-4 py-3">Personnel</th>
                              <th className="px-4 py-3">Role</th>
                              <th className="px-4 py-3">Logged In</th>
                              <th className="px-4 py-3">Logged Out</th>
                              <th className="px-4 py-3">Duty Duration</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                            {loginLogs.map((log) => {
                              const durationMin = log.sessionDuration ? Math.round(log.sessionDuration / 60) : null
                              const durationStr = durationMin 
                                ? durationMin >= 60 
                                  ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`
                                  : `${durationMin} min`
                                : '—'

                              return (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                      <span className="font-bold text-slate-800">{log.staffName}</span>
                                      <span className="text-[10px] text-slate-400">{log.staffEmail}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 capitalize text-xs text-slate-600">
                                    {log.staffRole.replace('_', ' ')}
                                  </td>
                                  <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                                    {new Date(log.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    <span className="block text-[9px] text-slate-400 font-normal">
                                      {new Date(log.loginTime).toLocaleDateString()}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-slate-600">
                                    {log.logoutTime 
                                      ? <>
                                          {new Date(log.logoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          <span className="block text-[9px] text-slate-400">
                                            {new Date(log.logoutTime).toLocaleDateString()}
                                          </span>
                                        </>
                                      : '—'
                                    }
                                  </td>
                                  <td className="px-4 py-3 text-xs font-medium text-slate-800">
                                    {durationStr}
                                  </td>
                                  <td className="px-4 py-3">
                                    <Badge 
                                      className={
                                        log.status === 'active' 
                                          ? 'bg-teal-50 text-teal-700 border border-teal-200 animate-pulse' 
                                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                                      }
                                    >
                                      {log.status === 'active' ? 'On Duty' : 'Shift Ended'}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {log.status === 'active' ? (
                                      <button
                                        disabled={isSigningOutStaff === log.id}
                                        onClick={() => handleForceSignOut(log.id)}
                                        className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold transition-all shadow-sm"
                                      >
                                        {isSigningOutStaff === log.id ? 'Signing Out...' : 'Sign Out Staff'}
                                      </button>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-medium italic">Closed</span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Security Standards */}
              <div className="space-y-6">
                <Card className="border-slate-100 shadow-sm bg-slate-900 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Lock className="h-5 w-5 text-teal-400" />
                      Daily Security Hub
                    </CardTitle>
                    <CardDescription className="text-slate-400 font-medium">
                      Control access for hospital staff duty shifts.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-xs text-slate-300 leading-relaxed font-light">
                      Staff must verify their identity with today's shift code immediately after logging in. The code automatically expires at the end of the day (23:59).
                    </p>

                    <div className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700/50 text-center space-y-3">
                      <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest">Active Shift Code</p>
                      
                      <div className="py-4 px-6 bg-slate-950 rounded-2xl font-mono text-3xl font-black tracking-widest text-teal-300 border border-slate-800 shadow-inner">
                        {data?.hospital?.shiftCode || 'NOT SET'}
                      </div>
                      
                      {data?.hospital?.shiftCodeExpiresAt && (
                        <p className="text-[10px] text-slate-400">
                          Expires: {new Date(data.hospital.shiftCodeExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>

                    <Button
                      onClick={() => {
                        setConfirmState({
                          isOpen: true,
                          title: 'Generate Shift Code',
                          description: 'Generate a new daily shift code? This will require staff on duty to re-verify using the new code.',
                          confirmText: 'Generate Code',
                          confirmBtnClass: 'bg-teal-600 hover:bg-teal-700 text-white',
                          onConfirm: async () => {
                            try {
                              const res = await generateHospitalShiftCode()
                              if (res.success && res.shiftCode) {
                                setAlertState({
                                  isOpen: true,
                                  title: 'Code Generated',
                                  description: `New Daily Shift Code generated: ${res.shiftCode}`,
                                  type: 'success'
                                })
                                setTimeout(() => {
                                  window.location.reload()
                                }, 2000)
                              } else {
                                setAlertState({
                                  isOpen: true,
                                  title: 'Error',
                                  description: res.error || 'Failed to generate shift code',
                                  type: 'error'
                                })
                              }
                            } catch (err) {
                              console.error(err)
                              setAlertState({
                                  isOpen: true,
                                  title: 'Error',
                                  description: 'Error generating shift code',
                                  type: 'error'
                                })
                            }
                          }
                        })
                      }}
                      className="w-full bg-teal-600 hover:bg-teal-700 font-bold py-6 rounded-2xl shadow-xl shadow-teal-500/10 flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4 text-white" />
                      {data?.hospital?.shiftCode ? 'Regenerate Code' : 'Generate Shift Code'}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-slate-100 shadow-sm bg-white">
                  <CardHeader>
                    <CardTitle className="text-slate-800 flex items-center gap-2 text-sm font-black uppercase tracking-wider">
                      <ShieldAlert className="h-5 w-5 text-amber-500" /> Security Standards
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-slate-500 space-y-2 leading-relaxed">
                    <p>• <strong>Automatic Timeout:</strong> Inactive staff terminals are automatically signed out after 8 hours to protect patient data.</p>
                    <p>• <strong>Duty Audits:</strong> Complete transparency of who accessed records at any given point during shifts.</p>
                    <p>• <strong>Role-Based Access:</strong> Only authorized clinical staff with valid accounts can view patient records.</p>
                  </CardContent>
                </Card>
              </div>

            </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Onboard New Patient</h2>
              <Button variant="outline" onClick={() => setShowOnboarding(false)}>
                ✕
              </Button>
            </div>
            
            <PatientOnboardingForm 
              onSuccess={() => {
                setShowOnboarding(false)
                refreshDashboard()
              }}
            />
          </div>
        </div>
      )}

      <Dialog open={showAddStaff} onOpenChange={setShowAddStaff}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add hospital staff</DialogTitle>
            <DialogDescription>
              Invite a midwife or hospital staff member. They will receive an email to sign up and join your facility.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStaff} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="staff-first">First name</Label>
                <Input
                  id="staff-first"
                  value={staffForm.firstName}
                  onChange={(e) => setStaffForm((f) => ({ ...f, firstName: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-last">Last name</Label>
                <Input
                  id="staff-last"
                  value={staffForm.lastName}
                  onChange={(e) => setStaffForm((f) => ({ ...f, lastName: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-email">Email</Label>
              <Input
                id="staff-email"
                type="email"
                value={staffForm.email}
                onChange={(e) => setStaffForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-phone">Phone (optional)</Label>
              <Input
                id="staff-phone"
                value={staffForm.phone}
                onChange={(e) => setStaffForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+233..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-role">Role</Label>
              <select
                id="staff-role"
                className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm font-medium"
                value={staffForm.role}
                onChange={(e) =>
                  setStaffForm((f) => ({
                    ...f,
                    role: e.target.value as 'midwife' | 'hospital_staff',
                  }))
                }
              >
                <option value="midwife">Midwife</option>
                <option value="hospital_staff">Hospital staff</option>
              </select>
            </div>
            {careStaff.length > 0 && (
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Current team ({careStaff.length})</p>
                <ul className="text-sm text-slate-700 space-y-1 max-h-28 overflow-y-auto">
                  {careStaff.map((s) => (
                    <li key={s.id}>
                      {s.firstName} {s.lastName}{' '}
                      <span className="text-slate-400">· {s.role.replace('_', ' ')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button type="submit" className="w-full bg-[#D48BA1] hover:bg-[#c47a90] font-bold" disabled={staffSaving}>
              {staffSaving ? 'Sending invite…' : 'Add staff member'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Custom Confirm Dialog ── */}
      <Dialog open={confirmState.isOpen} onOpenChange={(open) => !open && setConfirmState(s => ({ ...s, isOpen: false }))}>
        <DialogContent className="sm:max-w-md rounded-3xl border-0 shadow-2xl p-0 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-rose-400 via-rose-500 to-rose-600" />
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-3">
                <span className="h-10 w-10 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-100">
                  <AlertTriangle className="h-5 w-5 text-rose-500" />
                </span>
                {confirmState.title}
              </DialogTitle>
              <DialogDescription className="text-slate-600 text-sm leading-relaxed mt-3 font-medium">
                {confirmState.description}
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                className="rounded-xl border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                onClick={() => setConfirmState(s => ({ ...s, isOpen: false }))}
              >
                Cancel
              </Button>
              <Button
                className={`rounded-xl font-bold ${confirmState.confirmBtnClass || 'bg-rose-600 hover:bg-rose-700 text-white'}`}
                onClick={async () => {
                  setConfirmState(s => ({ ...s, isOpen: false }))
                  await confirmState.onConfirm()
                }}
              >
                {confirmState.confirmText}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Custom Alert Dialog ── */}
      <Dialog open={alertState.isOpen} onOpenChange={(open) => !open && setAlertState(s => ({ ...s, isOpen: false }))}>
        <DialogContent className="sm:max-w-sm rounded-3xl border-0 shadow-2xl p-0 overflow-hidden">
          <div className={`h-1.5 ${alertState.type === 'success' ? 'bg-gradient-to-r from-teal-400 to-emerald-500' : alertState.type === 'error' ? 'bg-gradient-to-r from-rose-400 to-rose-600' : 'bg-gradient-to-r from-blue-400 to-blue-600'}`} />
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-3">
                <span className={`h-10 w-10 rounded-2xl flex items-center justify-center border ${alertState.type === 'success' ? 'bg-teal-50 border-teal-100' : alertState.type === 'error' ? 'bg-rose-50 border-rose-100' : 'bg-blue-50 border-blue-100'}`}>
                  {alertState.type === 'success'
                    ? <CheckCircle2 className="h-5 w-5 text-teal-500" />
                    : alertState.type === 'error'
                    ? <AlertTriangle className="h-5 w-5 text-rose-500" />
                    : <ShieldAlert className="h-5 w-5 text-blue-500" />}
                </span>
                {alertState.title}
              </DialogTitle>
              <DialogDescription className="text-slate-600 text-sm leading-relaxed mt-2 font-medium">
                {alertState.description}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end">
              <Button
                className={`rounded-xl font-bold ${alertState.type === 'success' ? 'bg-teal-600 hover:bg-teal-700 text-white' : alertState.type === 'error' ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                onClick={() => setAlertState(s => ({ ...s, isOpen: false }))}
              >
                OK
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
    </ShiftCodeGate>

    {/* Floating Chat Stack — Facebook/LinkedIn style */}
    {openChats.length > 0 && (
      <div className="fixed bottom-0 right-6 flex items-end gap-4 z-50">
        {openChats.map((chat) => (
          <FloatingChatWindow
            key={chat.id}
            currentUserId={data?.dbUser?.id || user?.id}
            otherUserId={chat.id}
            otherUserName={chat.name}
            onClose={() => setOpenChats(prev => prev.filter(c => c.id !== chat.id))}
          />
        ))}
      </div>
    )}
    </SessionTimeoutGuard>
  )
}

import { onboardPatient } from '@/app/actions'
import { Check, Copy } from 'lucide-react'

function PregnancyQuickActions({
  pregnancy,
  careStaff,
  onUpdated,
}: {
  pregnancy: Pregnancy
  careStaff: { id: string; firstName: string; lastName: string; role: string }[]
  onUpdated: () => void
}) {
  const [visitDate, setVisitDate] = useState('')
  const [visitNotes, setVisitNotes] = useState('')
  const [staffId, setStaffId] = useState(pregnancy.assignedStaffId || '')
  const [savingVisit, setSavingVisit] = useState(false)
  const [savingStaff, setSavingStaff] = useState(false)

  const handleSchedule = async () => {
    if (!visitDate) {
      alert('Please choose a visit date')
      return
    }
    setSavingVisit(true)
    try {
      const res = await scheduleNextVisit(pregnancy.id, visitDate, visitNotes)
      if (res.success) {
        setVisitDate('')
        setVisitNotes('')
        onUpdated()
      } else {
        alert(res.error || 'Could not schedule visit')
      }
    } finally {
      setSavingVisit(false)
    }
  }

  const handleAssignStaff = async () => {
    if (!staffId) return
    setSavingStaff(true)
    try {
      const res = await assignMidwifeToPregnancy(pregnancy.id, staffId)
      if (res.success) onUpdated()
      else alert(res.error || 'Could not assign staff')
    } finally {
      setSavingStaff(false)
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Schedule next visit</p>
        <div className="flex flex-col gap-2">
          <input
            type="date"
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D48BA1]"
            min={new Date().toISOString().split('T')[0]}
          />
          <input
            type="text"
            placeholder="Notes (optional)"
            value={visitNotes}
            onChange={(e) => setVisitNotes(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D48BA1]"
          />
          <Button
            type="button"
            size="sm"
            disabled={savingVisit}
            onClick={handleSchedule}
            className="w-full bg-slate-900 hover:bg-slate-800 font-bold"
          >
            <Calendar className="w-4 h-4 mr-2" />
            {savingVisit ? 'Scheduling...' : 'Schedule visit'}
          </Button>
        </div>
      </div>
      {careStaff.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <UserCog className="w-3 h-3" /> Assign chat contact
          </p>
          <div className="flex gap-2">
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="flex-1 text-sm border border-slate-200 rounded-lg p-2 bg-white"
            >
              <option value="">Select staff...</option>
              {careStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} ({s.role.replace('_', ' ')})
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={savingStaff || !staffId}
              onClick={handleAssignStaff}
              className="font-bold shrink-0"
            >
              {savingStaff ? '...' : 'Assign'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Patient Onboarding Form Component
function PatientOnboardingForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [successData, setSuccessData] = useState<{
    email: string
    password?: string
    loginUrl: string
    isInvitationFlow?: boolean
    partnerInvite?: { email: string; invited: boolean; error?: string } | null
    clerkInviteSent?: boolean
    clerkErrorMsg?: string | null
  } | null>(null)
  const [copied, setCopied] = useState(false)
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    ghanaCardId: '',
    nhisNumber: '',
    nhisExpiryDate: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    age: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    gravidity: '',
    parity: '',
    lmp: '',
    bloodType: '',
    rhesusFactor: '',
    height: '',
    prePregnancyWeight: '',
    medicalHistory: '',
    allergies: '',
    partnerEmail: '',
    partnerFirstName: '',
    partnerLastName: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Real API call to onboard patient
      const result = await onboardPatient(formData)
      
      if (result.success && result.data) {
        setSuccessData(result.data)
      } else {
        alert(result.error || 'Failed to onboard patient')
      }
    } catch (error) {
      console.error('Error onboarding patient:', error)
      alert('Failed to onboard patient')
    } finally {
      setLoading(false)
    }
  }

  const copyCreds = () => {
    if (!successData) return
    let text = successData.isInvitationFlow
      ? `Patient Onboarded Successfully!\nEmail Address: ${successData.email}\nAn invitation email has been sent directly to the patient to complete registration and set their own secure password.`
      : `Patient Login Details:\nEmail: ${successData.email}\nPassword: ${successData.password}\nLogin at: ${successData.loginUrl}`
    if (successData.partnerInvite?.invited) {
      text += `\n\nPartner invitation sent to: ${successData.partnerInvite.email}`
    } else if (successData.partnerInvite?.error) {
      text += `\n\nPartner: ${successData.partnerInvite.error}`
    }
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (successData) {
    const isClerkFailed = successData.clerkInviteSent === false;

    return (
      <div className="p-6 text-center space-y-6">
        {isClerkFailed ? (
          <div className="h-20 w-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
            <span className="text-3xl">⚠️</span>
          </div>
        ) : (
          <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <Check className="h-10 w-10 text-green-600" />
          </div>
        )}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isClerkFailed ? "Patient Registered (Invite Failed)" : "Patient Onboarded!"}
          </h2>
          {isClerkFailed ? (
            <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-left text-amber-800 space-y-2">
              <p className="text-xs font-bold uppercase flex items-center gap-1">
                ⚠️ Email invitation could not be sent automatically
              </p>
              <p className="text-[11px] font-medium leading-relaxed">
                The local patient record was created successfully in the database, but the Clerk email invite failed.
              </p>
              <p className="text-[10px] font-mono bg-amber-100/70 p-2 rounded-lg text-amber-900 select-all overflow-x-auto max-w-full">
                Error: {successData.clerkErrorMsg || 'CLERK_SECRET_KEY is missing or invalid in environment.'}
              </p>
              <p className="text-[11px] font-semibold text-slate-700 mt-1">
                👉 Please ask your system administrator to configure the Clerk Secret Key in the <span className="font-mono text-xs font-bold">.env</span> file.
              </p>
            </div>
          ) : (
            <p className="text-gray-500 mt-2 text-sm">
              {successData.isInvitationFlow 
                ? "An official email invitation has been sent directly to the patient." 
                : "Please give these credentials to the patient now."}
            </p>
          )}
        </div>

        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-left space-y-3 relative">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Email Address</p>
            <p className="font-semibold text-gray-900">{successData.email}</p>
          </div>
          {successData.isInvitationFlow ? (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Registration Access</p>
              {isClerkFailed ? (
                <p className="text-sm font-bold text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-lg inline-block border border-rose-100">
                  Email Delivery Failed (Setup Required)
                </p>
              ) : (
                <p className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg inline-block border border-emerald-100">
                  Secure Invitation Sent via Email
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Temporary Password</p>
              <p className="font-mono font-bold text-pink-600 bg-pink-50 px-2 py-1 rounded inline-block">
                {successData.password}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Onboarding Signup Link</p>
            <p className="text-sm text-blue-600 truncate">{successData.loginUrl}</p>
          </div>
          {successData.partnerInvite && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Partner / Father</p>
              {successData.partnerInvite.invited ? (
                <p className="text-sm font-bold text-indigo-600">
                  Invitation sent to {successData.partnerInvite.email}
                </p>
              ) : (
                <p className="text-sm text-amber-700">{successData.partnerInvite.error || 'Not invited'}</p>
              )}
            </div>
          )}
          
          <button 
            onClick={copyCreds}
            className="absolute top-2 right-2 p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-gray-400" />}
          </button>
        </div>

        <Button 
          onClick={onSuccess}
          className="w-full bg-[#D48BA1] hover:bg-[#c47a90] text-white py-4 rounded-xl"
        >
          Close and Finish
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
            <input
              type="text"
              required
              id="firstName"
              placeholder="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D48BA1] focus:border-transparent"
            />
        </div>
        
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
            <input
              type="text"
              required
              id="lastName"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D48BA1] focus:border-transparent"
            />
        </div>
      </div>

      {/* Ghana Card ID — National ID field */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
        <label htmlFor="ghanaCardId" className="block text-sm font-bold text-teal-800 mb-1">
          Ghana Card ID <span className="font-normal text-teal-600">(National ID — strongly recommended)</span>
        </label>
        <p className="text-[11px] text-teal-600 mb-2">Used to uniquely identify the patient across all MCH facilities nationally.</p>
        <input
          type="text"
          id="ghanaCardId"
          placeholder="GHA-XXXXXXXXX-X"
          value={formData.ghanaCardId}
          onChange={(e) => setFormData({ ...formData, ghanaCardId: e.target.value.toUpperCase() })}
          className="w-full px-4 py-2 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono font-bold text-teal-900 placeholder:font-normal placeholder:text-teal-300"
        />
      </div>

      {/* NHIS Card Linking field */}
      <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="nhisNumber" className="block text-sm font-bold text-indigo-900 mb-1">
            NHIS Number
          </label>
          <p className="text-[11px] text-indigo-700/80 mb-2">National Health Insurance Scheme number.</p>
          <input
            type="text"
            id="nhisNumber"
            placeholder="XXXXXXXX"
            value={formData.nhisNumber}
            onChange={(e) => setFormData({ ...formData, nhisNumber: e.target.value.trim() })}
            className="w-full px-4 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono font-bold text-indigo-950 placeholder:font-normal"
          />
        </div>
        <div>
          <label htmlFor="nhisExpiryDate" className="block text-sm font-bold text-indigo-900 mb-1">
            NHIS Expiry Date
          </label>
          <p className="text-[11px] text-indigo-700/80 mb-2">To check for validity throughout pregnancy.</p>
          <input
            type="date"
            id="nhisExpiryDate"
            value={formData.nhisExpiryDate}
            onChange={(e) => setFormData({ ...formData, nhisExpiryDate: e.target.value })}
            className="w-full px-4 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-indigo-950 font-bold"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input
            type="email"
            required
            id="email"
            placeholder="email@example.com"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D48BA1] focus:border-transparent"
          />
        </div>
        
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
          <input
            type="tel"
            required
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            placeholder="+233XXXXXXXXX"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D48BA1] focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">Age (years)</label>
          <input
            type="number"
            id="age"
            min={10}
            max={60}
            value={formData.age}
            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            placeholder="e.g. 28"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D48BA1] focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">Address</label>
        <input
          type="text"
          required
          id="address"
          placeholder="Residential Address"
          value={formData.address}
          onChange={(e) => setFormData({...formData, address: e.target.value})}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />
      </div>


      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">Pregnancy Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="gravidity" className="block text-sm font-medium text-gray-700 mb-2">Gravidity (Number of Pregnancies)</label>
            <input
              type="number"
              required
              id="gravidity"
              min="1"
              value={formData.gravidity}
              onChange={(e) => setFormData({...formData, gravidity: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label htmlFor="parity" className="block text-sm font-medium text-gray-700 mb-2">Parity (Number of Births)</label>
            <input
              type="number"
              required
              id="parity"
              min="0"
              value={formData.parity}
              onChange={(e) => setFormData({...formData, parity: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label htmlFor="lmp" className="block text-sm font-medium text-gray-700 mb-2">Last Menstrual Period (LMP)</label>
            <input
              type="date"
              required
              id="lmp"
              value={formData.lmp}
              onChange={(e) => setFormData({...formData, lmp: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label htmlFor="bloodType" className="block text-sm font-medium text-gray-700 mb-2">Blood Type</label>
            <select
              required
              id="bloodType"
              value={formData.bloodType}
              onChange={(e) => setFormData({...formData, bloodType: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <option value="">Select blood type</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">Emergency Contact</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Name</label>
            <input
              type="text"
              required
              id="emergencyContact"
              placeholder="Next of Kin Name"
              value={formData.emergencyContact}
              onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label htmlFor="emergencyPhone" className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Phone</label>
            <input
              type="tel"
              required
              id="emergencyPhone"
              value={formData.emergencyPhone}
              onChange={(e) => setFormData({...formData, emergencyPhone: e.target.value})}
              placeholder="+233XXXXXXXXX"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-6">
        <Button
          type="submit"
          disabled={loading}
          className="bg-[#D48BA1] hover:bg-[#c47a90] font-bold py-6 px-8 rounded-xl shadow-lg transition-all"
        >
          {loading ? 'Creating Account...' : 'Onboard Patient & Send Login Details'}
        </Button>
        <Button type="button" variant="outline" onClick={() => {}}>
          Save as Draft
        </Button>
      </div>
    </form>
  )
}
