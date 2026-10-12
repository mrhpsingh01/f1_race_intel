'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { DRIVER_COLORS } from '@/lib/utils';

interface PositionChartProps {
  driversData: Record<string, { driver_id: number; laps: number[]; positions: number[] }>;
}

export default function PositionChart({ driversData }: PositionChartProps) {
  if (!driversData || Object.keys(driversData).length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-400">
        No lap position data available for this race.
      </div>
    );
  }

  // Find max laps
  let maxLaps = 0;
  Object.values(driversData).forEach((d) => {
    if (d.laps.length > 0) {
      maxLaps = Math.max(maxLaps, Math.max(...d.laps));
    }
  });

  // Build rows: [{ lap: 1, VER: 1, HAM: 2, ... }, ...]
  const chartData = [];
  const driverCodes = Object.keys(driversData);

  for (let l = 1; l <= maxLaps; l++) {
    const point: Record<string, any> = { lap: l };
    driverCodes.forEach((code) => {
      const idx = driversData[code].laps.indexOf(l);
      if (idx !== -1) {
        point[code] = driversData[code].positions[idx];
      }
    });
    chartData.push(point);
  }

  return (
    <div className="w-full">
      <div className="mb-2 text-sm text-zinc-400">
        Position changes across each lap (P1 at the top)
      </div>
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="lap"
              stroke="#71717a"
              label={{ value: 'Lap Number', position: 'insideBottom', offset: -5, fill: '#a1a1aa' }}
            />
            <YAxis
              reversed
              domain={[1, 20]}
              ticks={[1, 3, 5, 10, 15, 20]}
              stroke="#71717a"
              label={{ value: 'Position', angle: -90, position: 'insideLeft', fill: '#a1a1aa' }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#f4f4f5' }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            {driverCodes.map((code, idx) => (
              <Line
                key={code}
                type="monotone"
                dataKey={code}
                stroke={DRIVER_COLORS[idx % DRIVER_COLORS.length]}
                dot={false}
                strokeWidth={2}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
