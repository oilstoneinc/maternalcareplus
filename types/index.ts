export interface DashboardData {
  user: any
  pregnancy: any
  appointments: any[]
  labs: any[]
}

export interface HospitalDashboardData {
  patients: any[]
  pregnancies: any[]
  appointments: any[]
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
