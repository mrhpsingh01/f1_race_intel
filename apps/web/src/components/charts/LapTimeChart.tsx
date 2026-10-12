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
import { msToLapTime, COMPOUND_COLORS } from '@/lib/utils';

interface LapItem {
  driver_code: string;
  lap_number: number;
  lap_time_ms: number;
  compound: string;
  tyre_age: number;
  position: number;
  is_pit_lap: boolean;
}

interface LapTimeChartProps {
  laps: LapItem[];
}

export default function LapTimeChart({ laps }: LapTimeChartProps) {
  const [selectedDriver, setSelectedDriver] = useState<string>('ALL');

  if (!laps || laps.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-400">
        No lap timing records available.
      </div>
    );
  }

  // Filter out invalid times, pit in/out laps to isolate clean race pace
  const cleanLaps = laps.filter(
    (l) => !l.is_pit_lap && l.lap_time_ms && l.lap_time_ms > 50000 && l.lap_time_ms < 150000
  );

  const drivers = Array.from(new Set(cleanLaps.map((l) => l.driver_code))).sort();

  const filteredLaps =
    selectedDriver === 'ALL'
      ? cleanLaps
      : cleanLaps.filter((l) => l.driver_code === selectedDriver);

  // Group by compound for colored scatter series
  const compounds = Array.from(new Set(filteredLaps.map((l) => l.compound || 'UNKNOWN')));

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-zinc-400">
          Clean lap times across the Grand Prix (pit & caution laps excluded)
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-400">Filter Driver:</label>
          <select
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
          >
            <option value="ALL">All Drivers</option>
            {drivers.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="lap_number"
              type="number"
              name="Lap"
              stroke="#71717a"
              label={{ value: 'Lap Number', position: 'insideBottom', offset: -5, fill: '#a1a1aa' }}
            />
            <YAxis
              dataKey="lap_time_ms"
              type="number"
              name="Lap Time"
              stroke="#71717a"
              tickFormatter={(v) => msToLapTime(v)}
              domain={['auto', 'auto']}
              label={{ value: 'Lap Time', angle: -90, position: 'insideLeft', fill: '#a1a1aa' }}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ payload }) => {
                if (!payload || payload.length === 0) return null;
                const data = payload[0].payload as LapItem;
                return (
                  <div className="rounded border border-zinc-700 bg-zinc-900 p-2 text-xs text-zinc-200 shadow">
                    <p className="font-bold text-red-400">{data.driver_code}</p>
                    <p>Lap: {data.lap_number}</p>
                    <p>Time: {msToLapTime(data.lap_time_ms)}</p>
                    <p>Compound: {data.compound || 'Unknown'}</p>
                    <p>Tyre Age: {data.tyre_age ?? 'N/A'} laps</p>
                  </div>
                );
              }}
            />
            {compounds.map((comp) => {
              const compData = filteredLaps.filter((l) => (l.compound || 'UNKNOWN') === comp);
              return (
                <Scatter
                  key={comp}
                  name={comp}
                  data={compData}
                  fill={COMPOUND_COLORS[comp] || '#888888'}
                  shape="circle"
                />
              );
            })}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Compound legend */}
      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-zinc-400">
        {compounds.map((comp) => (
          <div key={comp} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: COMPOUND_COLORS[comp] || '#888888' }}
            />
            <span>{comp}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
