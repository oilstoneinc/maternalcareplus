import { HeartPulse, CalendarCheck, Baby, MessageCircle, Activity, ShieldCheck, ArrowRight, Lock } from 'lucide-react'
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
        redirect('/unauthorized') // Strictly blocking users with no role
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F4F3]">
      {/* Hero Section */}
      <section className="pt-20 pb-24 lg:pt-32 lg:pb-32 bg-[#F6F4F3] border-b border-slate-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-center">
            <div className="sm:text-center md:mx-auto lg:col-span-6 lg:text-left">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-white text-[#D48BA1] font-bold text-sm mb-6 border border-slate-100 shadow-sm mt-8 lg:mt-0">
                <Lock className="w-4 h-4 mr-2 text-[#D48BA1]" />
                Healthcare Provider Access Restricted
              </div>
              <h1 className="text-4xl tracking-tight font-black text-slate-900 sm:text-5xl md:text-6xl lg:text-5xl xl:text-7xl">
                The Standard in<br />
                <span className="text-[#D48BA1]">Maternal Care</span>
              </h1>
              <p className="mt-6 text-lg text-slate-600 sm:mt-5 sm:text-xl lg:text-xl font-medium leading-relaxed max-w-xl">
                A secure, provider-first platform for hospital management, patient onboarding, and real-time clinical tracking. Empowering healthcare facilities with modern digital infrastructure.
              </p>
              <div className="mt-10 sm:max-w-lg sm:mx-auto sm:text-center lg:text-left lg:mx-0 flex flex-col sm:flex-row gap-4 mb-4">
                <a
                  href="/sign-in"
                  className="inline-flex items-center justify-center px-10 py-5 border border-transparent text-xl font-black rounded-2xl text-white bg-[#D48BA1] hover:bg-[#c47a90] shadow-xl shadow-pink-100 transition-all transform hover:-translate-y-1"
                >
                  Provider Portal Login
                  <ArrowRight className="ml-2 w-6 h-6" />
                </a>
              </div>
              <p className="mt-4 text-slate-400 font-bold text-sm">
                * Public registration is disabled. Contact your administrator for access.
              </p>
            </div>
            <div className="mt-12 lg:mt-0 lg:col-span-6 flex justify-center">
              <div className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-white bg-white">
                <div className="relative aspect-[4/3] w-full bg-slate-50">
                  <Image
                    src="/hero-graphic.png"
                    alt="Healthcare Professional Illustration"
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
            <h2 className="text-4xl font-black text-slate-900 tracking-tight sm:text-5xl">
              Closed-Loop Management
            </h2>
            <p className="mt-6 text-xl text-slate-500 font-medium leading-relaxed">
              Clean. Secure. Professional. Everything you need to manage your practice from a single provider-controlled account.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <div className="bg-[#F6F4F3] p-10 rounded-3xl border border-slate-50 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-[#8ABD8A] rounded-2xl flex items-center justify-center mb-8 shadow-inner shadow-black/10">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4">Vitals & Analytics</h3>
              <p className="text-slate-600 font-medium leading-relaxed">Real-time monitoring and historical vitals analytics for every patient under your care.</p>
            </div>
            
            <div className="bg-[#F6F4F3] p-10 rounded-3xl border border-slate-50 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-[#D48BA1] rounded-2xl flex items-center justify-center mb-8 shadow-inner shadow-black/10">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4">Direct Messaging</h3>
              <p className="text-slate-600 font-medium leading-relaxed">Secure clinical communication with patients and multidisciplinary teams.</p>
            </div>

            <div className="bg-[#F6F4F3] p-10 rounded-3xl border border-slate-50 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-[#8ABD8A] rounded-2xl flex items-center justify-center mb-8 shadow-inner shadow-black/10">
                <CalendarCheck className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4">Patient Onboarding</h3>
              <p className="text-slate-600 font-medium leading-relaxed">Swiftly provision patient accounts and assign medical teams directly from your portal.</p>
            </div>

            <div className="bg-[#F6F4F3] p-10 rounded-3xl border border-slate-50 hover:shadow-lg transition-shadow border-l-4 border-l-[#D48BA1]">
              <div className="w-16 h-16 bg-[#D48BA1] rounded-2xl flex items-center justify-center mb-8 shadow-inner shadow-black/10">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4">HIPAA Compliance</h3>
              <p className="text-slate-600 font-medium leading-relaxed">Enhanced data protection and audit logs for hospital-level record keeping.</p>
            </div>

            <div className="bg-[#F6F4F3] p-10 rounded-3xl border border-slate-50 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-[#8ABD8A] rounded-2xl flex items-center justify-center mb-8 shadow-inner shadow-black/10">
                <Baby className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4">Obstetric Registry</h3>
              <p className="text-slate-600 font-medium leading-relaxed">Comprehensive tracking of gestational progress and obstetric history across your facility.</p>
            </div>

            <div className="bg-slate-900 p-10 rounded-3xl flex flex-col justify-center items-center text-center shadow-2xl">
               <h3 className="text-3xl font-black text-white mb-6">Partner with us</h3>
               <p className="text-slate-400 font-semibold mb-8">Request institutional access for your medical facility.</p>
               <div className="w-full bg-white/10 text-white font-black py-4 rounded-2xl border border-white/20">
                  Access Restricted
               </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-[#F6F4F3] py-16 border-t border-slate-100">
         <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-black text-slate-900 mb-4">MaternalCare Plus</h2>
            <p className="text-slate-500 font-bold mb-8 italic">"Precision in Maternal Healthcare"</p>
            <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">© 2026 MaternalCare Plus | Secure Portal v1.0</p>
         </div>
      </footer>
    </div>
  )
}
