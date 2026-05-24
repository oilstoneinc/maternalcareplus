'use client'

import { useState, useEffect } from 'react'
import { User } from '@clerk/nextjs/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { searchGlobalPatients, scheduleNextVisit, assignMidwifeToPregnancy, addHospitalStaffMember } from '@/app/actions'
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
  UserCog
} from 'lucide-react'

interface Pregnancy {
  id: string
  patientUserId: string
  patientName: string
  patientPhone?: string | null
  gestationalAge: number
  edd: string
  lastVisit: string
  nextVisit: string
  nextVisitDate?: string | null
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
}

export default function HospitalDashboardClient({ user, data }: { user: any, data: any }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const careStaff: { id: string; firstName: string; lastName: string; role: string }[] =
    data?.careStaff || []

  const formatDate = (date: any) => {
    if (!date) return 'N/A'
    try {
      return new Date(date).toLocaleDateString()
    } catch (e) {
      return 'N/A'
    }
  }

  const [patients, setPatients] = useState<Patient[]>(data?.patients?.map((p: any) => ({
    id: p.id,
    name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Anonymous',
    email: p.email,
    phone: p.phone,
    pregnancies: 1, // Mock/aggregate as needed
    status: p.isActive ? 'active' : 'inactive',
    lastVisit: formatDate(p.updatedAt)
  })) || [])
  
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

  const handleGlobalSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!globalSearchTerm.trim()) return
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
    if (data?.patients) {
      setPatients(
        data.patients.map((p: any) => ({
          id: p.id,
          name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email || 'Patient',
          email: p.email,
          phone: p.phone,
          pregnancies: 1,
          status: p.isActive ? 'active' : 'inactive',
          lastVisit: formatDate(p.updatedAt),
        }))
      )
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

  return (
    <div className="min-h-screen bg-[#F6F4F3] p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-slate-100">
               <HeartPulse className="w-7 h-7 text-[#D48BA1]" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">MaternalCare Plus</h1>
              <p className="text-slate-500 font-bold text-sm tracking-wide uppercase">Hospital Management Console</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
            <Button onClick={() => setShowOnboarding(true)} className="bg-[#D48BA1] hover:bg-[#c47a90] font-bold py-5 px-6 rounded-xl shadow-md transition-all">
              <Plus className="w-5 h-5 mr-2" />
              Onboard Patient
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddStaff(true)}
              className="border-slate-200 text-slate-700 font-bold py-5 rounded-xl"
            >
              <UserCog className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
            <Button variant="outline" className="border-slate-200 text-slate-600 font-bold py-5 rounded-xl">
              <Download className="w-4 h-4 mr-2" />
              Export Data
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="patients">Patients</TabsTrigger>
            <TabsTrigger value="pregnancies">Pregnancies</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest patient updates and appointments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pregnancies.slice(0, 3).map((pregnancy) => (
                      <div key={pregnancy.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{pregnancy.patientName}</p>
                          <p className="text-sm text-gray-600">Week {pregnancy.gestationalAge}</p>
                        </div>
                        <Badge className={getRiskColor(pregnancy.riskLevel)}>
                          {pregnancy.riskLevel} risk
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Appointments</CardTitle>
                  <CardDescription>Next 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pregnancies.slice(0, 3).map((pregnancy) => (
                      <div key={pregnancy.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{pregnancy.patientName}</p>
                          <p className="text-sm text-gray-600">{pregnancy.nextVisit}</p>
                        </div>
                        <Link href={`/dashboard/hospital/patients/${pregnancy.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
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
                      Search across all hospitals nationally to locate a visiting mother's unified MCH record by Name, Phone, Email, or Clerk ID.
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
                      placeholder="Enter patient name, phone, email, or ID (e.g. Ridge patient visiting for ANC)..."
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
                              <th className="px-4 py-3">Contact</th>
                              <th className="px-4 py-3">Primary Onboarding Facility</th>
                              <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                            {globalSearchResults.map((res) => (
                              <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-800">{res.name}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">ID: {res.id.substring(0,8)}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col text-xs text-slate-600">
                                    <span>{res.phone || 'No phone'}</span>
                                    <span className="text-muted-foreground font-mono">{res.email}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-slate-700 text-xs">{res.onboardedHospitalName}</span>
                                    <span className="text-[10px] text-muted-foreground">{res.onboardedHospitalLocation}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <Link href={`/dashboard/hospital/patients/${res.pregnancyId}`}>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="border-pink-200 text-[#D48BA1] hover:bg-pink-50 hover:text-[#c47a90] rounded-xl font-bold text-xs"
                                    >
                                      Retrieve History & Record ANC Visit
                                    </Button>
                                  </Link>
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
                        placeholder="Search patients..."
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
                      {patients.map((patient) => (
                        <tr key={patient.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{patient.name}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span>{patient.phone}</span>
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
                            <Button variant="outline" size="sm">
                              View
                            </Button>
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
                            <Link href={`/dashboard/chat?with=${pregnancy.patientUserId}`}>
                              <Button variant="outline" size="sm" aria-label="Message patient" title="Send message">
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                            </Link>
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
                            <Link href={`/dashboard/chat?with=${apt.patientUserId}`}>
                              <Button size="sm" className="bg-slate-900">
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
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
    </div>
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
  const [successData, setSuccessData] = useState<{email: string, password?: string, loginUrl: string, isInvitationFlow?: boolean} | null>(null)
  const [copied, setCopied] = useState(false)
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
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
    allergies: ''
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
    const text = successData.isInvitationFlow
      ? `Patient Onboarded Successfully!\nEmail Address: ${successData.email}\nAn invitation email has been sent directly to the patient to complete registration and set their own secure password.`
      : `Patient Login Details:\nEmail: ${successData.email}\nPassword: ${successData.password}\nLogin at: ${successData.loginUrl}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (successData) {
    return (
      <div className="p-6 text-center space-y-6">
        <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-bounce">
          <Check className="h-10 w-10 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Patient Onboarded!</h2>
          <p className="text-gray-500 mt-2 text-sm">
            {successData.isInvitationFlow 
              ? "An official email invitation has been sent directly to the patient." 
              : "Please give these credentials to the patient now."}
          </p>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-left space-y-3 relative">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Email Address</p>
            <p className="font-semibold text-gray-900">{successData.email}</p>
          </div>
          {successData.isInvitationFlow ? (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Registration Access</p>
              <p className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg inline-block">
                Secure Invitation Sent via Email
              </p>
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
