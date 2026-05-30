'use client'

import React, { useState } from 'react'
import { submitPartnershipRequest } from '@/app/actions'
import { ShieldAlert, CheckCircle, X, Loader2, Landmark, Mail, Phone, MapPin, ClipboardList } from 'lucide-react'

export default function PartnerCardClient() {
  const [isOpen, setIsOpen] = useState(false)
  const [hospitalName, setHospitalName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [region, setRegion] = useState('')
  const [notes, setNotes] = useState('')
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hospitalName || !email || !phone || !city || !region) {
      setErrorMsg('Please fill in all required fields.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg('')

    try {
      const res = await submitPartnershipRequest({
        hospitalName,
        email,
        phone,
        city,
        region,
        notes,
      })

      if (res.success) {
        setIsSuccess(true)
        setTimeout(() => {
          // Reset form and close
          setIsOpen(false)
          setIsSuccess(false)
          setHospitalName('')
          setEmail('')
          setPhone('')
          setCity('')
          setRegion('')
          setNotes('')
        }, 3000)
      } else {
        setErrorMsg(res.error || 'Something went wrong. Please try again.')
      }
    } catch (err) {
      console.error(err)
      setErrorMsg('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Partner with us Card */}
      <div className="bg-slate-900 p-10 rounded-3xl flex flex-col justify-center items-center text-center shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/10 via-transparent to-emerald-500/10 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
        <h3 className="text-3xl font-black text-white mb-6 z-10">Partner with us</h3>
        <p className="text-slate-400 font-semibold mb-8 z-10 leading-relaxed max-w-sm">
          Request institutional access for your medical facility.
        </p>
        <button
          onClick={() => setIsOpen(true)}
          className="w-full bg-white/10 hover:bg-white/20 text-white font-black py-4 rounded-2xl border border-white/20 hover:border-white/30 transition-all duration-300 transform active:scale-95 shadow-lg shadow-black/20 z-10 tracking-wide"
        >
          Request Institutional Access
        </button>
      </div>

      {/* Access Request Dialog Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all duration-300">
          {/* Modal Container */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative transform scale-100 transition-transform duration-300">
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-full transition-colors z-10"
              title="Close"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            {isSuccess ? (
              /* Success Anim View */
              <div className="p-8 text-center flex flex-col items-center justify-center py-16 space-y-6">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 animate-bounce">
                  <CheckCircle className="w-12 h-12" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">Request Submitted!</h3>
                  <p className="text-slate-500 font-semibold text-sm max-w-xs mx-auto leading-relaxed">
                    MaternalCare Plus administrators have received your details. We will contact your institution shortly.
                  </p>
                </div>
              </div>
            ) : (
              /* Form View */
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-pink-50 rounded-lg flex items-center justify-center text-[#D48BA1]">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900">Institutional Access Request</h3>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Provide your facility details below. Verified admins will generate a secure onboarding invitation token.
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-red-50 text-red-600 text-xs font-semibold rounded-xl flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Hospital Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest block">Facility / Hospital Name *</label>
                    <div className="relative">
                      <Landmark className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Korle Bu Teaching Hospital"
                        value={hospitalName}
                        onChange={(e) => setHospitalName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 focus:border-[#D48BA1] focus:ring-1 focus:ring-[#D48BA1] rounded-xl text-sm font-semibold text-slate-800 shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Representative Email */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest block">Representative Email *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        placeholder="e.g. admin@hospital.org"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 focus:border-[#D48BA1] focus:ring-1 focus:ring-[#D48BA1] rounded-xl text-sm font-semibold text-slate-800 shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Phone & Location */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-widest block">Phone Number *</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="tel"
                          required
                          placeholder="e.g. +233 24 123 4567"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 focus:border-[#D48BA1] focus:ring-1 focus:ring-[#D48BA1] rounded-xl text-sm font-semibold text-slate-800 shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-widest block">City / Town *</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. Accra"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 focus:border-[#D48BA1] focus:ring-1 focus:ring-[#D48BA1] rounded-xl text-sm font-semibold text-slate-800 shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Region */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest block">Region / State *</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Greater Accra Region"
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 focus:border-[#D48BA1] focus:ring-1 focus:ring-[#D48BA1] rounded-xl text-sm font-semibold text-slate-800 shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Additional Notes */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest block">Additional Comments / Notes</label>
                    <div className="relative">
                      <ClipboardList className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <textarea
                        rows={2}
                        placeholder="State any specific licensing or facilities (e.g. Level 2 NICU, 5 Obstetricians)..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 focus:border-[#D48BA1] focus:ring-1 focus:ring-[#D48BA1] rounded-xl text-sm font-semibold text-slate-800 shadow-sm resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-3 rounded-xl border border-slate-200 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-[#D48BA1] hover:bg-[#c47a90] disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold py-3 rounded-xl shadow-lg shadow-[#D48BA1]/20 text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Request'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
