import { HeartPulse, CalendarCheck, Baby, MessageCircle, Activity, ShieldCheck, ArrowRight } from 'lucide-react'
import Image from 'next/image'
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
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="pt-20 pb-24 lg:pt-32 lg:pb-32 bg-background border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-center">
            <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-white text-primary font-bold text-sm mb-6 border border-border mt-8 lg:mt-0">
                <HeartPulse className="w-5 h-5 mr-2 text-primary" />
                Modernizing Maternal Health
              </div>
              <h1 className="text-4xl tracking-tight font-extrabold text-foreground sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl">
                <span className="block xl:inline">Empowering your</span>{' '}
                <span className="block text-primary xl:inline">Pregnancy Journey</span>
              </h1>
              <p className="mt-4 text-base text-muted-foreground sm:mt-5 sm:text-lg lg:text-lg xl:text-xl">
                A premium digital platform bridging the gap between expectant mothers and healthcare professionals. Experience personalized care, real-time tracking, and expert support.
              </p>
              <div className="mt-10 sm:max-w-lg sm:mx-auto sm:text-center lg:text-left lg:mx-0 flex flex-col sm:flex-row gap-4 mb-4">
                <a
                  href="/sign-up"
                  className="inline-flex items-center justify-center px-8 py-3.5 border border-transparent text-lg font-bold rounded-xl text-primary-foreground bg-primary hover:opacity-90 transition-opacity"
                >
                  Start Your Journey
                  <ArrowRight className="ml-2 w-5 h-5" />
                </a>
                <a
                  href="/sign-in"
                  className="inline-flex items-center justify-center px-8 py-3.5 border-2 border-secondary text-lg font-bold rounded-xl text-foreground bg-white hover:bg-secondary hover:text-white transition-colors"
                >
                  Provider Sign In
                </a>
              </div>
            </div>
            <div className="mt-12 lg:mt-0 lg:col-span-6 flex justify-center">
              <div className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-xl border border-border bg-white">
                <div className="relative aspect-[4/3] w-full bg-gray-50">
                  <Image
                    src="/hero-graphic.png"
                    alt="MaternalCare Illustration"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight sm:text-4xl">
              Comprehensive Care at Your Fingertips
            </h2>
            <p className="mt-4 max-w-2xl text-xl text-muted-foreground mx-auto">
              Everything you need to manage your pregnancy or practice, cleanly integrated into one solid platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature Cards with Solid Colors */}
            <div className="bg-background p-8 rounded-2xl border border-border">
              <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center mb-6">
                <Activity className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">Vitals Tracking</h3>
              <p className="text-muted-foreground leading-relaxed">Monitor blood pressure, weight, and fetal movements with clear, interactive charts.</p>
            </div>
            
            <div className="bg-background p-8 rounded-2xl border border-border">
              <div className="w-14 h-14 bg-secondary rounded-xl flex items-center justify-center mb-6">
                <MessageCircle className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">Direct Chat</h3>
              <p className="text-muted-foreground leading-relaxed">Secure communication with midwives and doctors for peace of mind between visits.</p>
            </div>

            <div className="bg-background p-8 rounded-2xl border border-border">
              <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center mb-6">
                <CalendarCheck className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">Smart Scheduling</h3>
              <p className="text-muted-foreground leading-relaxed">Automated appointment booking and reminders for checkups and scans.</p>
            </div>

            <div className="bg-background p-8 rounded-2xl border border-border">
              <div className="w-14 h-14 bg-secondary rounded-xl flex items-center justify-center mb-6">
                <ShieldCheck className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">Secure Records</h3>
              <p className="text-muted-foreground leading-relaxed">Your complete maternal health history stored safely and accessible anywhere.</p>
            </div>

            <div className="bg-background p-8 rounded-2xl border border-border">
              <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center mb-6">
                <Baby className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">Baby Progress</h3>
              <p className="text-muted-foreground leading-relaxed">Weekly developmental milestones and educational articles tailored to you.</p>
            </div>

            {/* Solid CTA Card */}
            <div className="bg-primary p-8 rounded-2xl border border-transparent flex flex-col justify-center items-center text-center">
               <h3 className="text-3xl font-extrabold text-white mb-6">Ready to begin?</h3>
               <a href="/sign-up" className="bg-white text-primary font-extrabold py-4 px-8 rounded-xl hover:bg-background transition-colors w-full">Join Now</a>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-background py-10 border-t border-border">
         <div className="container mx-auto px-4 text-center">
            <p className="text-muted-foreground font-semibold">© 2026 MaternalCare Plus. All rights reserved.</p>
         </div>
      </footer>
    </div>
  )
}
