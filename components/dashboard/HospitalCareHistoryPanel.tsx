'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, MapPin, History } from 'lucide-react'
import type { CareHistoryEntry } from '@/lib/hospital-care-history'

type FacilitySummary = {
  hospitalName: string
  city: string
  region: string
  visitCount: number
  lastVisit: string
  isHome: boolean
}

export default function HospitalCareHistoryPanel({
  history,
  facilitySummary,
  homeHospitalName,
  compact = false,
}: {
  history: CareHistoryEntry[]
  facilitySummary?: FacilitySummary[]
  homeHospitalName?: string
  compact?: boolean
}) {
  if (!history?.length && !facilitySummary?.length) {
    return (
      <Card className="border-dashed border-slate-200">
        <CardContent className="py-8 text-center text-sm text-slate-500">
          No multi-facility care history yet. Visits and updates at other hospitals will appear here.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {facilitySummary && facilitySummary.length > 0 && (
        <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {facilitySummary.map((f) => (
            <div
              key={`${f.hospitalName}-${f.city}`}
              className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#D48BA1] shrink-0" />
                  <div>
                    <p className="font-bold text-sm text-slate-900">{f.hospitalName}</p>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {f.city}, {f.region}
                    </p>
                  </div>
                </div>
                {f.isHome && (
                  <Badge variant="outline" className="text-[9px] border-pink-200 text-pink-700">
                    Home clinic
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-2">
                {f.visitCount} record{f.visitCount !== 1 ? 's' : ''} · Last{' '}
                {f.lastVisit ? new Date(f.lastVisit).toLocaleDateString() : '—'}
              </p>
            </div>
          ))}
        </div>
      )}

      <Card className="border-slate-100 shadow-sm">
        <CardHeader className={compact ? 'pb-2' : undefined}>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-[#D48BA1]" />
            National care timeline
          </CardTitle>
          <CardDescription className="text-xs">
            {homeHospitalName
              ? `Linked to ${homeHospitalName} — all facilities that updated her MCH record`
              : 'Every facility that reviewed or updated this MCH record'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 max-h-[420px] overflow-y-auto">
          {history.map((entry) => (
            <div
              key={entry.id}
              className={`rounded-xl border p-3 text-sm ${
                entry.isVisitingFacility
                  ? 'border-amber-100 bg-amber-50/40'
                  : 'border-slate-100 bg-slate-50/50'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-bold text-slate-800">{entry.hospitalName}</span>
                {entry.isVisitingFacility && (
                  <Badge className="text-[9px] bg-amber-100 text-amber-800 hover:bg-amber-100">
                    Visiting facility
                  </Badge>
                )}
                <span className="text-[10px] text-slate-400 ml-auto">
                  {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ''}
                </span>
              </div>
              <p className="text-[10px] font-semibold text-[#D48BA1] uppercase tracking-wide">
                {entry.actionLabel}
              </p>
              <p className="text-slate-600 text-xs mt-1 leading-relaxed">{entry.summary}</p>
              {entry.staffName && (
                <p className="text-[10px] text-slate-400 mt-1">By {entry.staffName}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
