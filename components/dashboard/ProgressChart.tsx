'use client'

import React from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface ProgressChartProps {
  title: string
  description?: string
  data: any[]
  dataKey: string
  xAxisKey: string
  unit?: string
  color?: string
  gradientColor?: string
  targetValue?: number
  targetLabel?: string
  /** When true, renders without an outer Card (for use inside another card) */
  embedded?: boolean
  xAxisLabel?: string
}

export default function ProgressChart({
  title,
  description,
  data,
  dataKey,
  xAxisKey,
  unit = '',
  color = '#ec4899',
  gradientColor = '#fbcfe8',
  targetValue,
  targetLabel,
  embedded = false,
  xAxisLabel = 'Visit date',
}: ProgressChartProps) {
  const chart = (
    <div className="w-full min-w-0 h-[220px] sm:h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
        >
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis
            dataKey={xAxisKey}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            interval="preserveStartEnd"
            tickMargin={8}
            label={{
              value: xAxisLabel,
              position: 'insideBottom',
              offset: -2,
              fontSize: 10,
              fill: '#94a3b8',
            }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            width={36}
            tickMargin={4}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${value}${unit}`, title]}
            labelFormatter={(label) => String(label)}
          />
          {targetValue && (
            <ReferenceLine
              y={targetValue}
              stroke="#94a3b8"
              strokeDasharray="3 3"
              label={{
                value: targetLabel,
                position: 'insideTopRight',
                fill: '#94a3b8',
                fontSize: 10,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={3}
            fillOpacity={1}
            fill={`url(#gradient-${dataKey})`}
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )

  if (embedded) {
    return (
      <div className="min-w-0 w-full">
        <div className="mb-3">
          <h4 className="text-base font-bold text-slate-900">{title}</h4>
          {description && (
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          )}
        </div>
        {data.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-sm text-center px-4">No records yet — your clinic will add vitals at visits.</p>
          </div>
        ) : (
          chart
        )}
      </div>
    )
  }

  return (
    <Card className="border-none shadow-xl bg-white/60 backdrop-blur-md overflow-hidden min-w-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-2 pb-4 min-w-0">{chart}</CardContent>
    </Card>
  )
}
