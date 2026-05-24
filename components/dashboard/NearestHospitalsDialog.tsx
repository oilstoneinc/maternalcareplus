'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building2, MapPin, Phone, Loader2, Navigation } from 'lucide-react'
import { getHospitalsForLocator } from '@/app/actions'

type HospitalRow = {
  id: string
  name: string
  city: string
  region: string
  address: string
  phone: string
  type: string
  distanceKm: number | null
}

export default function NearestHospitalsDialog({
  registeredHospitalId,
  trigger,
}: {
  registeredHospitalId?: string
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hospitals, setHospitals] = useState<HospitalRow[]>([])
  const [locationNote, setLocationNote] = useState('')

  const loadHospitals = async (useGeo: boolean) => {
    setLoading(true)
    setLocationNote('')

    const fetchList = async (lat?: number, lng?: number) => {
      const list = await getHospitalsForLocator(lat, lng)
      setHospitals(list as HospitalRow[])
    }

    if (!useGeo || !navigator.geolocation) {
      await fetchList()
      if (useGeo) setLocationNote('Location unavailable — showing all partner facilities.')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await fetchList(pos.coords.latitude, pos.coords.longitude)
        setLocationNote('Sorted by distance from your current location.')
        setLoading(false)
      },
      async () => {
        await fetchList()
        setLocationNote('Could not access location — showing all facilities.')
        setLoading(false)
      },
      { enableHighAccuracy: false, timeout: 10000 }
    )
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next && hospitals.length === 0) {
      loadHospitals(true)
    }
  }

  const formatPhoneHref = (phone: string) => {
    const digits = phone.replace(/[^\d+]/g, '')
    return `tel:${digits}`
  }

  const mapsUrl = (h: HospitalRow) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${h.name}, ${h.address}, ${h.city}, ${h.region}`
    )}`

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Partner hospitals</DialogTitle>
          <DialogDescription>
            Find a facility near you. Tap call to reach the hospital directly.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 shrink-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => loadHospitals(true)}
            className="flex-1 font-bold"
          >
            <Navigation className="w-4 h-4 mr-1.5" />
            Near me
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => loadHospitals(false)}
            className="flex-1 font-bold"
          >
            All facilities
          </Button>
        </div>

        {locationNote && (
          <p className="text-xs text-slate-500 font-medium">{locationNote}</p>
        )}

        <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-sm">Loading hospitals…</p>
            </div>
          ) : hospitals.length === 0 ? (
            <p className="text-center py-8 text-sm text-slate-500">No partner hospitals listed yet.</p>
          ) : (
            hospitals.map((h) => (
              <div
                key={h.id}
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50/80 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 leading-tight">{h.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {h.city}, {h.region} · {h.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {h.id === registeredHospitalId && (
                      <Badge className="bg-pink-100 text-pink-800 text-[10px]">Your hospital</Badge>
                    )}
                    {h.distanceKm != null && (
                      <Badge variant="outline" className="text-[10px]">
                        {h.distanceKm < 1
                          ? `${Math.round(h.distanceKm * 1000)} m`
                          : `${h.distanceKm.toFixed(1)} km`}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-600 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {h.address}
                </p>
                <div className="flex gap-2 pt-1">
                  <Button asChild size="sm" className="flex-1 bg-slate-900 hover:bg-slate-800 font-bold">
                    <a href={formatPhoneHref(h.phone)}>
                      <Phone className="w-4 h-4 mr-1.5" />
                      Call
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="flex-1 font-bold">
                    <a href={mapsUrl(h)} target="_blank" rel="noopener noreferrer">
                      Directions
                    </a>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
