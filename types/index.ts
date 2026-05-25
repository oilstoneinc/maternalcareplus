export interface DashboardData {
  user: any
  pregnancy: any
  appointments: any[]
  labs: any[]
  vitals: any[]
  careContact?: any
  notifications?: any[]
  clinicRecommendations?: {
    title: string
    content: string
    source: string
    date?: string
  }[]
}

export interface HospitalDashboardData {
  hospital?: any
  patients: any[]
  pregnancies: any[]
  appointments: any[]
  careStaff?: any[]
  upcomingAppointments?: any[]
  messageThreads?: {
    patientUserId: string
    patientName: string
    pregnancyId: string
    lastMessage: string
    lastMessageAt: string
    unreadCount: number
    assignedStaffName: string | null
  }[]
}

/**
 * Get data for the Father Dashboard
 */
export interface FatherDashboardData {
  user: any
  pregnancy: any
  appointments: any[]
}

export interface AdminDashboardData {
  user: any
  allUsers: any[]
  userCounts: any[]
}

export interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  status: 'sent' | 'delivered' | 'read'
  createdAt: Date
}
