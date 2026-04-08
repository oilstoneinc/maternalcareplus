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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
            MaternalCare Plus
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8">
            Digital Antenatal Care Management System
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-xl p-8 md:p-12 border border-border">
          <h2 className="text-2xl font-semibold text-card-foreground mb-6">
            Welcome to Your Digital Pregnancy Journey
          </h2>
          
          <p className="text-muted-foreground mb-8 text-lg">
            Track your pregnancy progress, schedule appointments, receive educational resources, 
            and connect with healthcare professionals - all from your phone.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-primary/10 rounded-xl p-6 border border-primary/20">
              <h3 className="text-lg font-semibold text-primary mb-3">
                For Pregnant Women
              </h3>
              <ul className="text-foreground/80 text-sm space-y-2 text-left w-max mx-auto md:mx-0 md:w-auto">
                <li className="list-disc ml-4">Digital pregnancy tracking</li>
                <li className="list-disc ml-4">Appointment reminders</li>
                <li className="list-disc ml-4">Lab results monitoring</li>
                <li className="list-disc ml-4">Educational resources</li>
                <li className="list-disc ml-4">Midwife chat support</li>
              </ul>
            </div>

            <div className="bg-secondary/10 rounded-xl p-6 border border-secondary/20">
              <h3 className="text-lg font-semibold text-secondary mb-3">
                For Healthcare Providers
              </h3>
              <ul className="text-foreground/80 text-sm space-y-2 text-left w-max mx-auto md:mx-0 md:w-auto">
                <li className="list-disc ml-4">Patient management</li>
                <li className="list-disc ml-4">Appointment scheduling</li>
                <li className="list-disc ml-4">Real-time monitoring</li>
                <li className="list-disc ml-4">Secure communication</li>
                <li className="list-disc ml-4">Comprehensive records</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/sign-in"
              className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Sign In
            </a>
            <a
              href="/sign-up"
              className="bg-secondary text-secondary-foreground px-8 py-3 rounded-lg font-semibold hover:bg-secondary/90 transition-colors"
            >
              Sign Up
            </a>
          </div>
        </div>

        <div className="mt-8 text-muted-foreground text-sm">
          <p>MaternalCare Plus &bull; Professional Antenatal Management</p>
        </div>
      </div>
    </div>
  )
}
