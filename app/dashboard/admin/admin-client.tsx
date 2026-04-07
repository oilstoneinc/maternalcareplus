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
  Edit
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts'

interface AdminDashboardProps {
  user: any
  data: any
}

export default function AdminDashboardClient({ user, data }: AdminDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const userCounts = data?.userCounts || []
  const allUsers = data?.allUsers || []

  // Mock colors for pie chart
  const COLORS = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6']

  const stats = [
    { label: 'Total Users', value: allUsers.length, icon: Users, color: 'text-blue-500' },
    { label: 'System Health', value: '99.9%', icon: Activity, color: 'text-green-500' },
    { label: 'DB Connections', value: '14', icon: Database, color: 'text-purple-500' },
    { label: 'Security Alerts', value: '0', icon: Shield, color: 'text-gray-500' },
  ]

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      {/* Header */}
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
            <UserPlus className="h-4 w-4" /> Add Member
          </button>
          <button className="p-2 bg-white border border-border rounded-xl hover:bg-muted transition-colors shadow-sm">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Quick Stats Area */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-none bg-white/50 backdrop-blur-xl shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
              <stat.icon className="h-20 w-20" />
            </div>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold tracking-tight">{stat.value}</h3>
                <span className="text-[10px] text-green-500 flex items-center font-bold">
                  <TrendingUp className="h-3 w-3 mr-0.5" /> +2%
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Interface */}
        <div className="lg:col-span-2">
          <Card className="border-none shadow-xl bg-white/60 backdrop-blur-md min-h-[600px] overflow-hidden">
            <Tabs defaultValue="users" className="w-full">
              <div className="px-6 pt-6 flex items-center justify-between border-b pb-4">
                <TabsList className="bg-muted/50 p-1 rounded-xl">
                  <TabsTrigger value="users" className="rounded-lg px-6">User Records</TabsTrigger>
                  <TabsTrigger value="system" className="rounded-lg px-6">System Status</TabsTrigger>
                  <TabsTrigger value="logs" className="rounded-lg px-6">Audit Logs</TabsTrigger>
                </TabsList>
                <div className="relative group hidden md:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-indigo-600 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search users..."
                    className="pl-9 pr-4 py-1.5 rounded-lg border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm w-48 focus:w-64 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <TabsContent value="users" className="p-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Full Name</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Created At</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {allUsers.map((u: any) => (
                        <tr key={u.id} className="hover:bg-indigo-50/20 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white shadow-md">
                                {u.firstName?.[0]}{u.lastName?.[0]}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold">{u.firstName} {u.lastName}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">{u.clerkId.substring(0, 10)}...</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className={`rounded-full px-3 py-0.5 text-[10px] font-bold uppercase transition-all ${
                              u.role === 'admin' ? 'border-red-500 text-red-600 bg-red-50' :
                              u.role === 'hospital_staff' ? 'border-blue-500 text-blue-600 bg-blue-50' :
                              u.role === 'midwife' ? 'border-green-500 text-green-600 bg-green-50' :
                              'border-indigo-500 text-indigo-600 bg-indigo-50'
                            }`}>
                              {u.role.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-xs text-muted-foreground">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-1.5 hover:bg-white rounded-lg text-muted-foreground hover:text-indigo-600 shadow-sm transition-all border border-transparent hover:border-border">
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button className="p-1.5 hover:bg-white rounded-lg text-muted-foreground hover:text-red-600 shadow-sm transition-all border border-transparent hover:border-border">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="system" className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border border-dashed border-border bg-muted/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Server className="h-5 w-5 text-indigo-600" />
                      <div>
                        <p className="font-bold text-sm">Neon Database</p>
                        <p className="text-xs text-muted-foreground">Primary Cluster • gh-west-1</p>
                      </div>
                    </div>
                    <Badge className="bg-green-500">Connected</Badge>
                  </div>
                  <div className="p-4 rounded-2xl border border-dashed border-border bg-muted/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Lock className="h-5 w-5 text-indigo-600" />
                      <div>
                        <p className="font-bold text-sm">Clerk Auth</p>
                        <p className="text-xs text-muted-foreground">Standard Plan • Active</p>
                      </div>
                    </div>
                    <Badge className="bg-green-500">Secured</Badge>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Analytics & Insights */}
        <div className="space-y-6">
          <Card className="border-none shadow-xl bg-white/60 backdrop-blur-md">
            <CardHeader className="pb-0">
              <CardTitle className="text-lg">User Distribution</CardTitle>
              <CardDescription>Role breakdown across the platform</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={userCounts}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="role"
                  >
                    {userCounts.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    itemStyle={{fontSize: '12px', textTransform: 'capitalize'}}
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    formatter={(val) => <span className="text-[10px] text-muted-foreground uppercase font-bold">{val.replace('_', ' ')}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-gradient-to-br from-gray-900 to-black text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ArrowUpRight className="h-24 w-24" />
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-indigo-400" /> System Params
              </CardTitle>
              <CardDescription className="text-gray-400">Configure global platform constants</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Server Capacity</span>
                  <span>42%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 w-[42%]" />
                </div>
              </div>
              <button className="w-full py-2.5 bg-indigo-600 rounded-xl font-bold hover:bg-indigo-700 transition-colors text-sm shadow-lg shadow-indigo-900/40">
                Manage Config
              </button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-indigo-50 text-indigo-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5" /> Broadcast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-indigo-700/80 mb-4">Send a system-wide notification to all users or specific roles.</p>
              <textarea 
                className="w-full h-24 bg-white border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500/20 placeholder:text-indigo-200 resize-none"
                placeholder="Message to broadcast..."
              />
              <button className="mt-3 w-full py-2 bg-indigo-900 text-white rounded-xl font-bold text-xs hover:bg-black transition-colors shadow-md">
                Send Notification
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
