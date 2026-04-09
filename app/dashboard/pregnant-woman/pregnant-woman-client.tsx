'use client'

import { useState, useEffect } from 'react'
import { User } from '@clerk/nextjs/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar, 
  Baby, 
  Heart, 
  BookOpen, 
  MessageCircle, 
  TrendingUp, 
  Phone,
  Clock,
  ChevronRight,
  Bell,
  Activity,
  UserPlus,
  Copy,
  Check,
  Share2,
  Plus,
  Moon
} from 'lucide-react'
import ProgressChart from '@/components/dashboard/ProgressChart'
import { generateFatherJoinCode } from '@/app/actions'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'

interface DashboardData {
  user: any
  pregnancy: any
  appointments: any[]
  labs: any[]
}

export default function PregnantWomanClient({ user, data }: { user: any, data: DashboardData | null }) {
  const [gestationalAge, setGestationalAge] = useState(24) // Default/Mock for demo
  const [progress, setProgress] = useState(60)
  const [daysToEdd, setDaysToEdd] = useState(112)

  // Real weight tracking data from vitals
  const weightData = (data?.vitals || [])
    .map(v => ({ 
      week: v.notes?.match(/Week (\d+)/)?.[1] || new Date(v.recordedDate).toLocaleDateString(), 
      weight: parseFloat(v.weight as string) 
    }))
    .reverse()

  const bpData = (data?.vitals || [])
    .map(v => ({ 
      date: new Date(v.recordedDate).toLocaleDateString(), 
      systolic: v.bloodPressureSystolic,
      diastolic: v.bloodPressureDiastolic
    }))
    .reverse()

  const heartRateData = (data?.vitals || [])
    .map(v => ({ 
      date: new Date(v.recordedDate).toLocaleDateString(), 
      fhr: v.heartRate // Using heart rate field for FHR if recorded
    }))
    .reverse()

  const [shareCode, setShareCode] = useState<string | null>(data?.pregnancy?.fatherJoinCode || null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (data?.pregnancy) {
      // Calculate real gestational age from LMP
      const lmp = new Date(data.pregnancy.lmp)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - lmp.getTime())
      const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7))
      setGestationalAge(diffWeeks)
      setProgress((diffWeeks / 40) * 100)
      
      const edd = new Date(data.pregnancy.edd)
      const diffDays = Math.ceil((edd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      setDaysToEdd(diffDays)
      setShareCode(data.pregnancy.fatherJoinCode)
    }
  }, [data])

  const handleGenerateCode = async () => {
    if (!data?.pregnancy?.id) return
    setIsGenerating(true)
    try {
      const result = await generateFatherJoinCode(data.pregnancy.id)
      if (result.success) {
        setShareCode(result.code!)
      }
    } catch (error) {
      console.error('Error generating code:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = () => {
    if (shareCode) {
      navigator.clipboard.writeText(shareCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sweet Greetings, {user?.firstName} ✨</h1>
            <p className="text-gray-600">You're making wonderful progress on your journey.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="rounded-full shadow-sm bg-white border-muted">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </Button>
            <Button 
              className="btn-pink rounded-full shadow-md"
              onClick={() => window.location.href = `/dashboard/chat?with=${data?.pregnancy?.midwifeId || ''}`}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat Midwife
            </Button>
          </div>
        </header>

        {/* Hero Progress Section */}
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md overflow-hidden ring-1 ring-black/5">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Baby className="w-48 h-48 text-secondary" />
          </div>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="flex flex-col justify-center">
                <span className="text-sm font-medium text-secondary mb-1 uppercase tracking-wider">Current Progress</span>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-5xl font-bold text-gray-900">Week {gestationalAge}</h2>
                  <span className="text-muted-foreground font-medium">/ 40</span>
                </div>
                <Progress value={progress} className="h-3 mt-4 bg-pink-50" />
                <p className="text-sm text-gray-500 mt-2">Approximately {Math.floor(gestationalAge / 4)} months along</p>
              </div>

              <div className="flex flex-col justify-center border-l border-muted md:pl-8">
                <span className="text-sm font-medium text-primary mb-1 uppercase tracking-wider">Countdown to EDD</span>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-4xl font-bold text-gray-900">{daysToEdd > 0 ? daysToEdd : 0}</h2>
                  <span className="text-gray-500 font-medium">Days left</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Estimated Date: {data?.pregnancy?.edd ? new Date(data.pregnancy.edd).toLocaleDateString() : 'August 15, 2024'}</p>
              </div>

              <div className="flex flex-col justify-center border-l border-muted lg:pl-8 lg:col-span-2">
                <div className="bg-primary/5 rounded-2xl p-6 flex items-center gap-4 ring-1 ring-primary/10">
                  <div className="bg-primary p-3 rounded-xl shadow-lg shadow-primary/20">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-primary">Your Baby's Growth</h4>
                    <p className="text-sm text-primary/80">At week {gestationalAge}, your baby is about the size of a {gestationalAge < 20 ? 'large banana' : 'cantaloupe'}!</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Health Metrics & Charts */}
            <Card className="border-none shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Health Tracking</CardTitle>
                  <CardDescription>Monitor your vitals throughout the pregnancy</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-secondary hover:text-secondary/80 hover:bg-secondary/5 transition-colors">
                  <Plus className="w-4 h-4 mr-1" />
                  Record Vitals
                </Button>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="weight">
                  <TabsList className="mb-6">
                    <TabsTrigger value="weight">Weight (kg)</TabsTrigger>
                    <TabsTrigger value="bp">Blood Pressure</TabsTrigger>
                    <TabsTrigger value="heart">Fetal Heart Rate</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="weight" className="pt-4">
                    <ProgressChart 
                      title="Weight Tracking"
                      description="Your weight gain journey over time"
                      data={weightData}
                      dataKey="weight"
                      xAxisKey="week"
                      unit=" kg"
                      color="hsl(330, 81%, 60%)"
                    />
                  </TabsContent>

                  <TabsContent value="weight" className="pt-4">
                    <ProgressChart 
                      title="Weight Tracking"
                      description="Your weight gain journey over time"
                      data={weightData.length > 0 ? weightData : [{ week: 'Start', weight: 0 }]}
                      dataKey="weight"
                      xAxisKey="week"
                      unit=" kg"
                      color="hsl(330, 81%, 60%)"
                    />
                  </TabsContent>

                  <TabsContent value="bp" className="pt-4">
                    {bpData.length > 0 ? (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={bpData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="systolic" stroke="#ef4444" name="Systolic" strokeWidth={2} />
                            <Line type="monotone" dataKey="diastolic" stroke="#3b82f6" name="Diastolic" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-gray-500 bg-gray-50 rounded-xl">
                        <div className="text-center">
                          <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                          <p>Start recording your BP to see trends</p>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="heart" className="pt-4">
                    {heartRateData.length > 0 ? (
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={heartRateData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="date" />
                              <YAxis domain={['auto', 'auto']} />
                              <Tooltip />
                              <Line type="monotone" dataKey="fhr" stroke="#ec4899" name="Fetal Heart Rate" strokeWidth={3} dot={{ r: 4 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-gray-500 bg-gray-50 rounded-xl">
                        <div className="text-center">
                          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
                          <p>Fetal heart rate tracking will appear here</p>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Educational Resources */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-xl font-bold text-foreground">Recommended for You</h3>
                <Button variant="ghost" size="sm" className="text-secondary hover:bg-secondary/5">View All</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: "Nutrition for Week 24", icon: Heart, color: "bg-red-50 text-red-600" },
                  { title: "Managing Back Pain", icon: Activity, color: "bg-orange-50 text-orange-600" },
                  { title: "Safe Exercises", icon: TrendingUp, color: "bg-green-50 text-green-600" },
                  { title: "Sleep Best Practices", icon: Moon, color: "bg-purple-50 text-purple-600" }
                ].map((item, i) => (
                  <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${item.color}`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{item.title}</h4>
                        <p className="text-xs text-gray-500">5 min read • Expert advice</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-secondary transition-colors" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar Area */}
          <div className="space-y-8">
            
            {/* Partner Invite Code */}
            <Card className="border-none shadow-lg bg-primary/5 overflow-hidden relative group ring-1 ring-primary/10">
              <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform">
                <UserPlus className="w-24 h-24 text-primary" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                  <UserPlus className="w-4 h-4" />
                  Support your Partner
                </CardTitle>
                <CardDescription className="text-indigo-700/70 text-[10px]">
                  Share this code with the father to link your accounts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                {shareCode ? (
                  <div className="space-y-3">
                    <div className="bg-white p-3 rounded-xl border border-indigo-100 flex items-center justify-between shadow-sm">
                      <span className="font-mono text-lg font-black tracking-widest text-indigo-600">
                        {shareCode}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={copyToClipboard}
                        className="h-8 w-8 text-indigo-400 hover:text-indigo-600"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 text-[10px] border-indigo-200 text-indigo-600 hover:bg-white"
                        onClick={handleGenerateCode}
                        disabled={isGenerating}
                      >
                        Refresh Code
                      </Button>
                      <Button size="sm" className="flex-1 text-[10px] btn-pink shadow-md">
                        <Share2 className="h-3 w-3 mr-1" />
                        Share
                      </Button>
                    </div>
                    <p className="text-[10px] text-center text-muted-foreground font-medium uppercase tracking-tighter">Expires in 24 hours</p>
                  </div>
                ) : (
                  <Button 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-md"
                    onClick={handleGenerateCode}
                    disabled={isGenerating}
                  >
                    {isGenerating ? 'Generating...' : 'Generate Invite Code'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Appointments */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-secondary" />
                  Upcoming Visits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {(data?.appointments?.length ?? 0) > 0 ? (
                  data?.appointments.map((apt, i) => (
                    <div key={i} className="flex gap-4 relative">
                      {i < (data?.appointments?.length ?? 0) - 1 && (
                        <div className="absolute left-6 top-10 bottom-0 w-[2px] bg-gray-100" />
                      )}
                      <div className="bg-secondary/10 text-secondary p-3 h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{new Date(apt.scheduledDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <Clock className="w-3 h-3 mr-1" />
                          9:00 AM
                        </div>
                        <p className="text-sm font-medium text-secondary mt-2">Routine Checkup</p>
                        <p className="text-xs text-gray-400">Ridge Hospital, Accra</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="bg-secondary/5 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Calendar className="text-secondary" />
                    </div>
                    <p className="text-sm text-gray-500">No scheduled appointments</p>
                    <Button variant="outline" size="sm" className="mt-4">Book Now</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-none shadow-lg bg-secondary text-white ring-1 ring-secondary/20">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-4">Emergency Support</h3>
                <p className="text-pink-100 text-sm mb-6">Need immediate medical advice or have an emergency?</p>
                <div className="space-y-3">
                  <Button className="w-full bg-white text-secondary hover:bg-secondary-foreground hover:text-white font-bold transition-all duration-300">
                    <Phone className="w-4 h-4 mr-2" />
                    Call Nurse Line
                  </Button>
                  <Button variant="outline" className="w-full border-pink-400 text-white hover:bg-pink-500">
                    Find Nearest Hospital
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Lab Results Quick View */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Recent Lab Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(data?.labs?.length ?? 0) > 0 ? (
                  data?.labs.map((lab, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{lab.testName}</p>
                        <p className="text-xs text-gray-500">{new Date(lab.resultDate).toLocaleDateString()}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-700 border-none">Normal</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 py-2">No recent lab results to display.</p>
                )}
                <Button variant="link" className="text-blue-600 w-full p-0 text-sm">View Medical History</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

