'use client'

import { useState, useEffect } from 'react'
import { User } from '@clerk/nextjs/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Calendar, 
  Baby, 
  Phone, 
  Plus, 
  Search,
  Filter,
  Download,
  TrendingUp,
  AlertTriangle,
  HeartPulse
} from 'lucide-react'

interface Pregnancy {
  id: string
  patientName: string
  gestationalAge: number
  edd: string
  lastVisit: string
  nextVisit: string
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

export default function HospitalDashboardClient({ user, data }: { user: User | null, data: any }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [patients, setPatients] = useState<Patient[]>(data?.patients?.map((p: any) => ({
    id: p.id,
    name: `${p.firstName} ${p.lastName}`,
    email: p.email,
    phone: p.phone,
    pregnancies: 1, // Mock/aggregate as needed
    status: p.isActive ? 'active' : 'inactive',
    lastVisit: p.updatedAt?.toLocaleDateString() || 'N/A'
  })) || [])
  
  const [pregnancies, setPregnancies] = useState<Pregnancy[]>(data?.pregnancies?.map((p: any) => ({
    id: p.id,
    patientName: "Patient Name", // Would need to join or pass in data
    gestationalAge: p.gestationalAge || 0,
    edd: p.edd?.toLocaleDateString() || 'N/A',
    lastVisit: 'N/A',
    nextVisit: 'N/A',
    riskLevel: 'low',
    status: p.status
  })) || [])
  const [searchTerm, setSearchTerm] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    // - [x] Implement the Admin Dashboard
    // - [x] `/dashboard/admin/page.tsx`
    // - [x] `/dashboard/admin/admin-client.tsx`
    // - [/] Implement foundational UI components if needed (e.g., Progress charts)
    // - [/] Verify functionality and role-based access
    if (data) {
      // Data is now handled in initial state, but can be updated here if data prop changes
    }
  }, [data])

  const stats = {
    totalPatients: patients.length,
    activePregnancies: pregnancies.filter(p => p.status === 'active').length,
    highRiskPregnancies: pregnancies.filter(p => p.riskLevel === 'high').length,
    upcomingAppointments: 12
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
          <div className="flex gap-3 mt-4 md:mt-0">
            <Button onClick={() => setShowOnboarding(true)} className="bg-[#D48BA1] hover:bg-[#c47a90] font-bold py-5 px-6 rounded-xl shadow-md transition-all">
              <Plus className="w-5 h-5 mr-2" />
              Onboard Patient
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
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="patients" className="space-y-6">
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
                          <h3 className="font-semibold">{pregnancy.patientName}</h3>
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
                            <span className="font-medium">{pregnancy.nextVisit}</span>
                          </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <Button size="sm" className="flex-1">
                            View Details
                          </Button>
                          <Button variant="outline" size="sm" aria-label="Call Patient">
                            <Phone className="w-4 h-4" />
                          </Button>
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
                <CardTitle>Appointment Schedule</CardTitle>
                <CardDescription>Manage and view upcoming appointments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Calendar integration coming soon</p>
                </div>
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
                // Refresh patient list
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

import { onboardPatient } from '@/app/actions'

// Patient Onboarding Form Component
function PatientOnboardingForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
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
      
      if (result.success) {
        onSuccess()
      } else {
        alert(result.error)
      }
    } catch (error) {
      console.error('Error onboarding patient:', error)
      alert('Failed to onboard patient')
    } finally {
      setLoading(false)
    }
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
