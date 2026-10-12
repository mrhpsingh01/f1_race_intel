'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { formatDeltaMs } from '@/lib/utils';

interface DeltaChartProps {
  distance: number[];
  deltaMs: (number | null)[];
  driverA: string;
  driverB: string;
}

export default function DeltaChart({
  distance,
  deltaMs,
  driverA,
  driverB,
}: DeltaChartProps) {
  if (!distance || distance.length === 0 || !deltaMs || deltaMs.length === 0) {
    return null;
  }

  const data = distance.map((d, i) => ({
    dist: Math.round(d),
    delta: deltaMs[i] !== null ? Math.round(deltaMs[i]!) : 0,
  }));

  return (
    <div className="rounded border border-hairline-border bg-cockpit-console p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="font-bold uppercase tracking-wider text-pure-white flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-telemetry-cyan" />
          <span>Continuous Time Delta (Gap Evolution)</span>
        </div>
        <div className="text-[11px] text-muted-steel flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-telemetry-cyan" />
            <strong className="text-telemetry-cyan">{driverA}</strong> ahead (+Δ)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-telemetry-amber" />
            <strong className="text-telemetry-amber">{driverB}</strong> ahead (-Δ)
          </span>
        </div>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="deltaColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.45} />
                <stop offset="50%" stopColor="#00E5FF" stopOpacity={0.05} />
                <stop offset="95%" stopColor="#FFB800" stopOpacity={0.45} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E232D" />
            <XAxis
              dataKey="dist"
              stroke="#64748B"
              label={{ value: 'Track Distance (m)', position: 'insideBottom', offset: -2, fill: '#64748B', fontSize: 11 }}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              stroke="#64748B"
              tickFormatter={(v) => `${(v / 1000).toFixed(2)}s`}
              domain={['auto', 'auto']}
              tick={{ fontSize: 10, fontFamily: 'monospace' }}
            />
            <ReferenceLine y={0} stroke="#64748B" strokeDasharray="2 2" strokeWidth={1.5} />
            <Tooltip
              contentStyle={{ backgroundColor: '#11141A', borderColor: 'rgba(255,255,255,0.1)', fontSize: '12px', fontFamily: 'monospace' }}
              formatter={(val: any) => [formatDeltaMs(Number(val)), 'Time Difference']}
            />
            <Area
              type="monotone"
              dataKey="delta"
              stroke="#00E5FF"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#deltaColor)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
