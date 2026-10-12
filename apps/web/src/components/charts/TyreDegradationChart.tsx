'use client';

import React, { useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { COMPOUND_COLORS } from '@/lib/utils';

interface StintLap {
  driver_code: string;
  lap_number: number;
  lap_time_ms: number;
  compound: string;
  tyre_age: number;
  is_pit_lap: boolean;
}

interface TyreDegradationChartProps {
  laps: StintLap[];
}

export default function TyreDegradationChart({ laps }: TyreDegradationChartProps) {
  const [selectedCompound, setSelectedCompound] = useState<string>('ALL');

  if (!laps || laps.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-400">
        No tyre stint data available for degradation modeling.
      </div>
    );
  }

  // Filter out pit laps, caution periods, and out laps
  const cleanLaps = laps.filter(
    (l) =>
      !l.is_pit_lap &&
      l.tyre_age > 1 &&
      l.lap_time_ms &&
      l.lap_time_ms > 50000 &&
      l.lap_time_ms < 150000
  );

  const compounds = Array.from(new Set(cleanLaps.map((l) => l.compound || 'UNKNOWN')));
  const filtered =
    selectedCompound === 'ALL'
      ? cleanLaps
      : cleanLaps.filter((l) => (l.compound || 'UNKNOWN') === selectedCompound);

  // Compute simple empirical degradation rate (ms per lap of tyre age)
  let degEstimateText = 'Calculating degradation rate...';
  if (filtered.length >= 5) {
    const x = filtered.map((l) => l.tyre_age);
    const y = filtered.map((l) => l.lap_time_ms);
    const n = x.length;
    const xMean = x.reduce((a, b) => a + b, 0) / n;
    const yMean = y.reduce((a, b) => a + b, 0) / n;
    const num = x.reduce((acc, xi, i) => acc + (xi - xMean) * (y[i] - yMean), 0);
    const den = x.reduce((acc, xi) => acc + (xi - xMean) ** 2, 0);
    const slope = den !== 0 ? num / den : 0;
    const degPerLapSec = (slope / 1000).toFixed(3);
    degEstimateText = `Estimated compound pace loss: ~${degPerLapSec}s per lap of tyre life (accounting for fuel burn-off)`;
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-zinc-200">
            Observed Tyre Age vs. Lap Time
          </div>
          <div className="text-xs text-zinc-400">{degEstimateText}</div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-400">Compound:</label>
          <select
            value={selectedCompound}
            onChange={(e) => setSelectedCompound(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
          >
            <option value="ALL">All Compounds</option>
            {compounds.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="tyre_age"
              type="number"
              name="Tyre Age"
              stroke="#71717a"
              label={{ value: 'Tyre Age (Laps on Tyre)', position: 'insideBottom', offset: -5, fill: '#a1a1aa' }}
            />
            <YAxis
              dataKey="lap_time_ms"
              type="number"
              name="Lap Time"
              stroke="#71717a"
              tickFormatter={(v) => `${(v / 1000).toFixed(1)}s`}
              domain={['auto', 'auto']}
              label={{ value: 'Lap Time', angle: -90, position: 'insideLeft', fill: '#a1a1aa' }}
            />
            <Tooltip
              content={({ payload }) => {
                if (!payload || payload.length === 0) return null;
                const d = payload[0].payload as StintLap;
                return (
                  <div className="rounded border border-zinc-700 bg-zinc-900 p-2 text-xs text-zinc-200 shadow">
                    <p className="font-semibold text-yellow-400">{d.driver_code}</p>
                    <p>Compound: {d.compound}</p>
                    <p>Tyre Age: {d.tyre_age} laps</p>
                    <p>Time: {(d.lap_time_ms / 1000).toFixed(3)}s</p>
                  </div>
                );
              }}
            />
            {compounds.map((comp) => {
              const compData = filtered.filter((l) => (l.compound || 'UNKNOWN') === comp);
              return (
                <Scatter
                  key={comp}
                  name={comp}
                  data={compData}
                  fill={COMPOUND_COLORS[comp] || '#888888'}
                />
              );
            })}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
