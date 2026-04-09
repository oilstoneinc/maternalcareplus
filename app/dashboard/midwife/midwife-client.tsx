'use client'

import React, { useState } from 'react'
import { User } from '@clerk/nextjs/server'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  MessageSquare, 
  MessageCircle,
  Calendar, 
  Activity, 
  AlertCircle,
  Clock,
  CheckCircle,
  Search,
  Filter,
  MoreVertical,
  ChevronRight,
  Phone,
  Mail,
  Heart
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell
} from 'recharts'

import { recordAntenatalVisit } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface MidwifeDashboardProps {
  user: any
  data: any
}

export default function MidwifeDashboardClient({ user, data }: MidwifeDashboardProps) {
  const [showRecording, setShowRecording] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Stats
  const stats = [
    { label: 'Total Patients', value: data?.patients?.length || 0, icon: Users, color: 'text-blue-500' },
    { label: 'High Risk', value: '3', icon: AlertCircle, color: 'text-red-500' },
    { label: 'Upcoming Today', value: '5', icon: Calendar, color: 'text-purple-500' },
    { label: 'Unread Messages', value: '12', icon: MessageSquare, color: 'text-green-500' },
  ]

  // Mock Patient Risk Data for Chart
  const riskData = [
    { name: 'Low', count: 12, color: '#10b981' },
    { name: 'Medium', count: 5, color: '#f59e0b' },
    { name: 'High', count: 3, color: '#ef4444' },
  ]

  const weeklyVisits = [
    { day: 'Mon', visits: 4 },
    { day: 'Tue', visits: 7 },
    { day: 'Wed', visits: 5 },
    { day: 'Thu', visits: 8 },
    { day: 'Fri', visits: 6 },
    { day: 'Sat', visits: 2 },
    { day: 'Sun', visits: 1 },
  ]

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto bg-background min-h-screen">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Midwife Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName || 'Midwife'}. monitoring patient care.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search patients..."
              className="pl-10 pr-4 py-2 rounded-full border border-muted bg-white focus:outline-none focus:ring-2 focus:ring-primary/50 w-full md:w-64 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-2 rounded-full border border-border bg-background hover:bg-muted transition-colors">
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="overflow-hidden border-none bg-white/80 backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300 group ring-1 ring-black/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-2xl font-bold mt-1 group-hover:scale-110 transition-transform origin-left">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-2xl bg-muted/50 group-hover:bg-muted transition-colors`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Patient Monitoring & Analytics */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="patients" className="w-full">
            <TabsList className="bg-muted p-1 rounded-xl">
              <TabsTrigger value="patients" className="rounded-lg px-6">Patients</TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-lg px-6">Analytics</TabsTrigger>
              <TabsTrigger value="appointments" className="rounded-lg px-6">Appointments</TabsTrigger>
            </TabsList>
            
            <TabsContent value="patients" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 gap-4">
                {data?.patients?.map((patient: any) => (
                  <Card 
                    key={patient.id} 
                    className="group hover:bg-muted/50 transition-all border-none bg-white/80 shadow-sm hover:shadow-md cursor-pointer overflow-hidden ring-1 ring-black/5"
                    onClick={() => window.location.href = `/dashboard/chat?with=${patient.id}`}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0">
                        <span className="font-bold text-primary">
                          {patient.firstName?.[0]}{patient.lastName?.[0]}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold truncate">{patient.firstName} {patient.lastName}</h4>
                          <Badge variant={patient.isActive ? 'default' : 'secondary'} className="rounded-full">
                            {patient.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-secondary" /> Week 24</span>
                          <span className="flex items-center gap-1 border-l pl-3"><AlertCircle className="h-3 w-3 text-yellow-500" /> Low Risk</span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-lg bg-white/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Risk Distribution</CardTitle>
                    <CardDescription>Overall patient risk classification</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={riskData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={60} />
                        <Tooltip 
                          cursor={{fill: 'transparent'}}
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                          {riskData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-white/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Weekly Visits</CardTitle>
                    <CardDescription>Number of checkups per day</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weeklyVisits}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="visits" 
                          stroke="hsl(215, 100%, 50%)" 
                          strokeWidth={3} 
                          dot={{ r: 4, fill: 'hsl(215, 100%, 50%)' }}
                          activeDot={{ r: 6, fill: 'hsl(215, 100%, 40%)' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Support Chat Hub & Reminders */}
        <div className="space-y-6">
          <Card className="border-none shadow-xl bg-secondary text-white overflow-hidden ring-1 ring-secondary/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" /> Support Chat
                </CardTitle>
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-6 w-6 rounded-full border-2 border-secondary bg-white/20 backdrop-blur-sm" />
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-pink-50 mb-4 font-light">You have 12 active conversations with patients needing guidance.</p>
              <button 
                className="w-full py-2.5 bg-white text-secondary rounded-xl font-semibold hover:bg-pink-50 transition-colors shadow-lg"
                onClick={() => window.location.href = '/dashboard/chat'}
              >
                Open Chat Hub
              </button>
            </CardContent>
            <div className="h-1 bg-white/20 w-3/4 mx-auto mb-2 rounded-full overflow-hidden">
              <div className="h-full bg-green-400 w-1/3" />
            </div>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-md ring-1 ring-black/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-secondary" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Patient Onboarded', user: 'Ama Serwaa', time: '2m ago', icon: CheckCircle, color: 'text-green-500' },
                { label: 'Lab Result Uploaded', user: 'Abena Mensah', time: '1h ago', icon: Activity, color: 'text-blue-500' },
                { label: 'Rescheduled Appt', user: 'Esi Osei', time: '3h ago', icon: Calendar, color: 'text-purple-500' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 group cursor-pointer">
                  <div className={`p-2 rounded-xl bg-white shadow-sm group-hover:scale-110 transition-transform`}>
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.user} • {item.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-md overflow-hidden relative ring-1 ring-black/5">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Heart className="h-24 w-24 text-secondary rotate-12" />
            </div>
            <CardHeader>
              <CardTitle className="text-lg">Real-time Care</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Communicate with your patients in real-time using our custom chat.</p>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  className="flex items-center justify-center gap-2 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                  onClick={() => window.location.href = '/dashboard/chat'}
                >
                  <MessageCircle className="h-4 w-4" /> Hub
                </button>
                <button 
                  className="flex items-center justify-center gap-2 py-2 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20 transition-colors"
                >
                  <Calendar className="h-4 w-4" /> Schedule
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
