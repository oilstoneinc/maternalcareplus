'use client'

import React, { useState } from 'react'
import { CheckCircle, Loader2, Mail, Phone, MapPin, Send } from 'lucide-react'

export default function ContactFormClient() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !message) {
      setErrorMsg('Please fill in all required fields.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg('')

    try {
      // Simulate API submit for contact form
      await new Promise((resolve) => setTimeout(resolve, 1500))
      
      setIsSuccess(true)
      setName('')
      setEmail('')
      setSubject('')
      setMessage('')
      
      setTimeout(() => {
        setIsSuccess(false)
      }, 5000)
    } catch (err) {
      console.error(err)
      setErrorMsg('Failed to send message. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
      {/* Contact Info Details */}
      <div className="lg:col-span-5 space-y-8">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#D48BA1]/10 text-[#D48BA1] border border-[#D48BA1]/20 font-bold text-[10px] uppercase tracking-widest">
            Get In Touch
          </span>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight mt-4 sm:text-5xl">
            Contact Us
          </h2>
          <p className="text-slate-500 font-medium mt-4 leading-relaxed">
            Have questions about institutional onboarding, provider capabilities, or patient registrations? Our support teams are available to assist.
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm flex-shrink-0">
              <Mail className="w-5 h-5 text-[#D48BA1]" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Support</p>
              <p className="font-bold text-slate-800 text-lg mt-1">support@maternalcareplus.org</p>
              <p className="text-xs text-slate-500 mt-0.5">Response within 24 hours</p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm flex-shrink-0">
              <Phone className="w-5 h-5 text-[#D48BA1]" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Support Hotlines</p>
              <p className="font-bold text-slate-800 text-lg mt-1">+233 30 212 3456</p>
              <p className="text-xs text-slate-500 mt-0.5">Mon - Fri: 8:00 AM - 5:00 PM</p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm flex-shrink-0">
              <MapPin className="w-5 h-5 text-[#D48BA1]" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Regional Headquarters</p>
              <p className="font-bold text-slate-800 text-lg mt-1">Healthcare Technology Hub</p>
              <p className="text-xs text-slate-500 mt-0.5">Airport Residential Area, Accra, Ghana</p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Contact Form */}
      <div className="lg:col-span-7 bg-[#F6F4F3] border border-slate-100 p-8 md:p-10 rounded-3xl relative overflow-hidden">
        {isSuccess ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-16 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 animate-bounce">
              <CheckCircle className="w-12 h-12" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Message Sent Successfully!</h3>
              <p className="text-slate-500 font-semibold text-sm max-w-xs mx-auto leading-relaxed">
                Thank you for reaching out. A MaternalCare Plus representative has received your inquiry and will contact you shortly.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleContactSubmit} className="space-y-6 animate-in fade-in duration-500">
            <h3 className="text-2xl font-black text-slate-800">Send us a Message</h3>
            
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-600 text-xs font-semibold rounded-xl">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Adwoa Owusu"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#D48BA1] focus:ring-1 focus:ring-[#D48BA1] rounded-xl text-sm font-semibold text-slate-800 shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. adwoa@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#D48BA1] focus:ring-1 focus:ring-[#D48BA1] rounded-xl text-sm font-semibold text-slate-800 shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Subject / Inquiry Type</label>
              <input
                type="text"
                placeholder="e.g. Institutional Access Inquiry"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#D48BA1] focus:ring-1 focus:ring-[#D48BA1] rounded-xl text-sm font-semibold text-slate-800 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Your Message *</label>
              <textarea
                rows={4}
                required
                placeholder="Please type your questions or request details here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#D48BA1] focus:ring-1 focus:ring-[#D48BA1] rounded-xl text-sm font-semibold text-slate-800 shadow-sm resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 text-sm tracking-wide"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending Message...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Message
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
