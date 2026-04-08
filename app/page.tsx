import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const user = await currentUser()
  
  if (user) {
    const role = user.publicMetadata?.role as string
    switch (role) {
      case 'pregnant_woman':
        redirect('/dashboard/pregnant-woman')
      case 'father':
        redirect('/dashboard/father')
      case 'midwife':
        redirect('/dashboard/midwife')
      case 'hospital_staff':
        redirect('/dashboard/hospital')
      case 'admin':
        redirect('/dashboard/admin')
      default:
        redirect('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            MaternalCare Plus
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8">
            Digital Antenatal Care Management System
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Welcome to Your Digital Pregnancy Journey
          </h2>
          
          <p className="text-gray-600 mb-8 text-lg">
            Track your pregnancy progress, schedule appointments, receive educational resources, 
            and connect with healthcare professionals - all from your phone.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-pink-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-pink-800 mb-3">
                For Pregnant Women
              </h3>
              <ul className="text-pink-700 text-sm space-y-2">
                <li>• Digital pregnancy tracking</li>
                <li>• Appointment reminders</li>
                <li>• Lab results monitoring</li>
                <li>• Educational resources</li>
                <li>• Midwife chat support</li>
              </ul>
            </div>

            <div className="bg-blue-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">
                For Healthcare Providers
              </h3>
              <ul className="text-blue-700 text-sm space-y-2">
                <li>• Patient management</li>
                <li>• Appointment scheduling</li>
                <li>• Real-time monitoring</li>
                <li>• Secure communication</li>
                <li>• Comprehensive records</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/sign-in"
              className="bg-pink-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-pink-700 transition-colors"
            >
              Sign In
            </a>
            <a
              href="/sign-up"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Sign Up
            </a>
          </div>
        </div>

        <div className="mt-8 text-gray-600 text-sm">
          <p>Brought to you in partnership with Ghana Health Service</p>
        </div>
      </div>
    </div>
  )
}
