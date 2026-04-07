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

  // Weight tracking mock data
  const weightData = [
    { week: 4, weight: 62 },
    { week: 8, weight: 62.5 },
    { week: 12, weight: 63.8 },
    { week: 16, weight: 65.2 },
    { week: 20, weight: 67.1 },
    { week: 24, weight: 68.5 },
  ]

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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sweet Greetings, {user?.firstName} ✨</h1>
            <p className="text-gray-600">You're making wonderful progress on your journey.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="rounded-full shadow-sm">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </Button>
            <Button className="bg-pink-600 hover:bg-pink-700 rounded-full shadow-md">
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat Midwife
            </Button>
          </div>
        </header>

        {/* Hero Progress Section */}
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Baby className="w-48 h-48 text-pink-600" />
          </div>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="flex flex-col justify-center">
                <span className="text-sm font-medium text-pink-600 mb-1">Current Progress</span>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-5xl font-bold text-gray-900">Week {gestationalAge}</h2>
                  <span className="text-gray-500 font-medium">/ 40</span>
                </div>
                <Progress value={progress} className="h-3 mt-4 bg-pink-100" />
                <p className="text-sm text-gray-500 mt-2">Approximately {Math.floor(gestationalAge / 4)} months along</p>
              </div>

              <div className="flex flex-col justify-center border-l border-gray-100 md:pl-8">
                <span className="text-sm font-medium text-blue-600 mb-1">Countdown to EDD</span>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-4xl font-bold text-gray-900">{daysToEdd > 0 ? daysToEdd : 0}</h2>
                  <span className="text-gray-500 font-medium">Days left</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">Estimated Date: {data?.pregnancy?.edd ? new Date(data.pregnancy.edd).toLocaleDateString() : 'August 15, 2024'}</p>
              </div>

              <div className="flex flex-col justify-center border-l border-gray-100 lg:pl-8 lg:col-span-2">
                <div className="bg-blue-50 rounded-2xl p-4 flex items-center gap-4">
                  <div className="bg-blue-600 p-3 rounded-xl">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-blue-900">Your Baby's Growth</h4>
                    <p className="text-sm text-blue-700">At week {gestationalAge}, your baby is about the size of a {gestationalAge < 20 ? 'large banana' : 'cantaloupe'}!</p>
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
                <Button variant="ghost" size="sm" className="text-pink-600 hover:text-pink-700">
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
                      color="#ec4899"
                    />
                  </TabsContent>

                  <TabsContent value="bp" className="h-[300px] flex items-center justify-center text-gray-500 bg-gray-50 rounded-xl">
                    <div className="text-center">
                      <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>Start recording your BP to see trends</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="heart" className="h-[300px] flex items-center justify-center text-gray-500 bg-gray-50 rounded-xl">
                    <div className="text-center">
                      <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>Fetal heart rate tracking coming soon</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Educational Resources */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-xl font-bold text-gray-900">Recommended for You</h3>
                <Button variant="ghost" size="sm" className="text-pink-600">View All</Button>
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
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-pink-600 transition-colors" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar Area */}
          <div className="space-y-8">
            
            {/* Partner Invite Code */}
            <Card className="border-none shadow-lg bg-indigo-50 overflow-hidden relative group">
              <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform">
                <UserPlus className="w-24 h-24 text-indigo-600" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-indigo-900">
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
                      <Button size="sm" className="flex-1 text-[10px] bg-indigo-600 hover:bg-indigo-700 shadow-md">
                        <Share2 className="h-3 w-3 mr-1" />
                        Share
                      </Button>
                    </div>
                    <p className="text-[10px] text-center text-indigo-400">Expires in 24 hours</p>
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
                  <Calendar className="w-5 h-5 text-pink-600" />
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
                      <div className="bg-pink-50 text-pink-600 p-3 h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{new Date(apt.scheduledDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <Clock className="w-3 h-3 mr-1" />
                          9:00 AM
                        </div>
                        <p className="text-sm font-medium text-pink-600 mt-2">Routine Checkup</p>
                        <p className="text-xs text-gray-400">Ridge Hospital, Accra</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="bg-pink-50 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Calendar className="text-pink-600" />
                    </div>
                    <p className="text-sm text-gray-500">No scheduled appointments</p>
                    <Button variant="outline" size="sm" className="mt-4">Book Now</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-none shadow-lg bg-pink-600 text-white">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-4">Emergency Support</h3>
                <p className="text-pink-100 text-sm mb-6">Need immediate medical advice or have an emergency?</p>
                <div className="space-y-3">
                  <Button className="w-full bg-white text-pink-600 hover:bg-pink-50 font-bold">
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

