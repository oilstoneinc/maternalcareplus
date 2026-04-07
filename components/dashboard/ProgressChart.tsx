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
  targetLabel
}: ProgressChartProps) {
  return (
    <Card className="border-none shadow-xl bg-white/60 backdrop-blur-md overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="h-[250px] pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
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
              tick={{fontSize: 10, fill: '#94a3b8'}}
              dy={10}
              label={{ value: 'Week', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#94a3b8' }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{fontSize: 10, fill: '#94a3b8'}}
              dx={-10}
            />
            <Tooltip 
              contentStyle={{
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                fontSize: '12px'
              }}
              formatter={(value: any) => [`${value}${unit}`, title]}
              labelFormatter={(label) => `Week ${label}`}
            />
            {targetValue && (
              <ReferenceLine 
                y={targetValue} 
                stroke="#94a3b8" 
                strokeDasharray="3 3" 
                label={{ value: targetLabel, position: 'right', fill: '#94a3b8', fontSize: 10 }} 
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
      </CardContent>
    </Card>
  )
}
