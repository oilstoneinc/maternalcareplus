import { HeartPulse, CalendarCheck, Baby, MessageCircle, Activity, ShieldCheck, ArrowRight, Lock, Users, Target, Building, BookOpen, MapPin } from 'lucide-react'
import Image from 'next/image'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { hospitals } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

import PartnerCardClient from '@/components/partner-card-client'
import ContactFormClient from '@/components/contact-form-client'

export const dynamic = 'force-dynamic'

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

  // Fetch active partner hospitals
  let partnerHospitalsList: any[] = []
  try {
    partnerHospitalsList = await db.query.hospitals.findMany({
      where: eq(hospitals.isActive, true),
      orderBy: (hospitals, { asc }) => [asc(hospitals.name)]
    })
  } catch (error) {
    console.error("Database Error fetching hospitals:", error)
  }

  return (
    <div className="min-h-screen bg-[#F6F4F3] font-sans scroll-smooth">
      {/* Premium Header */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-white/40 shadow-sm transition-all duration-300">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <a href="/" className="flex-shrink-0 flex items-center gap-2 cursor-pointer">
              <div className="w-10 h-10 bg-gradient-to-br from-[#D48BA1] to-[#e6a8bc] rounded-2xl flex items-center justify-center shadow-lg shadow-pink-100">
                <HeartPulse className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black text-slate-800 tracking-tight">Maternal<span className="text-[#D48BA1]">Care</span>+</span>
            </a>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-sm font-bold text-slate-600 hover:text-[#D48BA1] transition-colors">Features</a>
              <a href="#about-us" className="text-sm font-bold text-slate-600 hover:text-[#D48BA1] transition-colors">About Us</a>
              <a href="#partners" className="text-sm font-bold text-slate-600 hover:text-[#D48BA1] transition-colors">Partner Hospitals</a>
              <a href="#contact" className="text-sm font-bold text-slate-600 hover:text-[#D48BA1] transition-colors">Contact Us</a>
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center gap-4">
              <a href="/sign-in" className="hidden sm:inline-flex text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">
                Provider Login
              </a>
              <a 
                href="/sign-in" 
                className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-black rounded-full text-white bg-slate-900 hover:bg-slate-800 shadow-md transition-all hover:scale-105"
              >
                Patient Portal <ArrowRight className="ml-2 w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-24 lg:pt-40 lg:pb-32 bg-gradient-to-b from-[#F6F4F3] to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-center">
            <div className="sm:text-center md:mx-auto lg:col-span-6 lg:text-left">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-white text-[#D48BA1] font-bold text-xs mb-6 border border-pink-100 shadow-sm mt-8 lg:mt-0">
                <Lock className="w-3.5 h-3.5 mr-2 text-[#D48BA1]" />
                Healthcare Provider Access Restricted
              </div>
              <h1 className="text-5xl tracking-tighter font-black text-slate-900 sm:text-6xl md:text-7xl lg:text-6xl xl:text-7xl leading-[1.1]">
                The Standard in<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D48BA1] to-[#e6a8bc]">Maternal Care</span>
              </h1>
              <p className="mt-6 text-lg text-slate-500 sm:mt-8 sm:text-xl lg:text-xl font-medium leading-relaxed max-w-xl">
                A secure, unified maternal care platform connecting hospitals, midwives, and mothers for real-time tracking, digital MCH record books, and instant messaging.
              </p>
              <div className="mt-10 sm:max-w-lg sm:mx-auto lg:mx-0 flex flex-col gap-4 mb-4">
                <a
                  href="/sign-in"
                  className="inline-flex items-center justify-center px-10 py-5 border border-transparent text-xl font-black rounded-3xl text-white bg-[#D48BA1] hover:bg-[#c47a90] shadow-xl shadow-pink-200/50 transition-all transform hover:-translate-y-1 w-full sm:w-auto"
                >
                  Pregnant Woman Portal — Sign In
                  <HeartPulse className="ml-3 w-6 h-6" />
                </a>
                <div className="text-sm font-bold text-slate-500 mt-2">
                  Are you a clinical provider? Hospital portal access is invite-only.{" "}
                  <a href="/sign-in" className="text-[#D48BA1] hover:underline font-black">
                    Authorized Provider Sign-In
                  </a>
                </div>
              </div>
              <p className="mt-4 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                * Patients must be registered by their hospital first to log in.
              </p>
            </div>
            <div className="mt-16 lg:mt-0 lg:col-span-6 flex justify-center">
              <div className="relative w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl shadow-slate-200/50 border-[8px] border-white bg-white transform rotate-1 hover:rotate-0 transition-transform duration-500">
                <div className="relative aspect-[4/3] w-full bg-slate-50 rounded-[1.5rem] overflow-hidden">
                  <Image
                    src="/realistic_hero_family.png"
                    alt="Happy African Family holding a newborn"
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
      <section id="features" className="py-24 bg-white">
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

            <div className="bg-[#F6F4F3] p-10 rounded-3xl border border-slate-50 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-[#D48BA1] rounded-2xl flex items-center justify-center mb-8 shadow-inner shadow-black/10">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4">Digital MCH Book</h3>
              <p className="text-slate-600 font-medium leading-relaxed">Give parents a stunning digital maternal and child health record book synced in real-time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about-us" className="py-24 bg-gradient-to-b from-white to-[#F6F4F3]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative rounded-[2rem] overflow-hidden shadow-2xl h-[500px] border-8 border-white">
              <Image 
                src="/hero-graphic.png" 
                alt="About MaternalCare Plus"
                fill
                className="object-cover"
              />
            </div>
            <div className="mt-10 lg:mt-0 space-y-6">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#D48BA1]/10 text-[#D48BA1] border border-[#D48BA1]/20 font-bold text-[10px] uppercase tracking-widest">
                Our Mission
              </span>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight sm:text-5xl">
                Empowering Maternal Health Through Technology
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed font-medium">
                MaternalCare Plus was founded with a singular vision: to drastically reduce maternal and neonatal mortality by bridging the communication and data gap between expectant mothers and clinical professionals.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <Target className="w-8 h-8 text-[#D48BA1] mb-3" />
                  <h4 className="font-black text-slate-900 mb-2">Our Goal</h4>
                  <p className="text-sm text-slate-500 font-medium">To provide every mother with a comprehensive, secure digital record of her journey.</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <Users className="w-8 h-8 text-[#D48BA1] mb-3" />
                  <h4 className="font-black text-slate-900 mb-2">Our Team</h4>
                  <p className="text-sm text-slate-500 font-medium">Built in collaboration with leading obstetricians, midwives, and public health experts.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Hospitals Section */}
      <section id="partners" className="py-24 bg-[#F6F4F3]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[10px] uppercase tracking-widest mb-4">
              Clinical Network
            </span>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight sm:text-5xl">
              Partner Hospitals
            </h2>
            <p className="mt-6 text-lg text-slate-500 font-medium leading-relaxed">
              We collaborate with premier healthcare institutions to deliver seamless care. Explore our growing network of authorized facilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {partnerHospitalsList.length > 0 ? (
              partnerHospitalsList.map(hospital => (
                <div key={hospital.id} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
                    <Building className="w-6 h-6 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">{hospital.name}</h3>
                  <div className="space-y-1 mt-4">
                    <p className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" /> {hospital.city}, {hospital.region}
                    </p>
                    <p className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                      <HeartPulse className="w-4 h-4 text-slate-400" /> {hospital.type}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-slate-100">
                <p className="text-slate-500 font-bold">Network expansion currently in progress.</p>
              </div>
            )}
          </div>
          
          <div className="max-w-3xl mx-auto">
             <PartnerCardClient />
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section id="contact" className="py-24 bg-white border-t border-slate-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <ContactFormClient />
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-[#F6F4F3] py-16 border-t border-slate-200">
         <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-black text-slate-900 mb-4">MaternalCare Plus</h2>
            <p className="text-slate-500 font-bold mb-8 italic">"Precision in Maternal Healthcare"</p>
            <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">© 2026 MaternalCare Plus | Secure Portal v1.0</p>
         </div>
      </footer>
    </div>
  )
}
