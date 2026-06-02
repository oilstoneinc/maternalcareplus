export interface DashboardData {
  user: any
  pregnancy: any
  appointments: any[]
  labs: any[]
  vitals: any[]
  careContact?: any
  notifications?: any[]
  pastPregnancies?: any[]   // All completed pregnancies with delivery/child summaries
  clinicRecommendations?: {
    title: string
    content: string
    source: string
    date?: string
  }[]
  careHistory?: {
    id: string
    action: string
    actionLabel: string
    summary: string
    hospitalName: string
    hospitalCity: string
    hospitalRegion: string
    isVisitingFacility: boolean
    staffName: string | null
    createdAt: string
  }[]
  careFacilitySummary?: {
    hospitalName: string
    city: string
    region: string
    visitCount: number
    lastVisit: string
    isHome: boolean
  }[]
  linkedPartner?: {
    email: string
    firstName: string
    lastName: string
    accessActive: boolean
  } | null
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
