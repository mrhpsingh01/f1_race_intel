'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface TelemetryChartProps {
  distance: number[];
  speed: Record<string, (number | null)[]>;
  throttle: Record<string, (number | null)[]>;
  brake: Record<string, (number | null)[]>;
  gear: Record<string, (number | null)[]>;
  driverA: string;
  driverB: string;
}

export default function TelemetryChart({
  distance,
  speed,
  throttle,
  brake,
  gear,
  driverA,
  driverB,
}: TelemetryChartProps) {
  if (!distance || distance.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-steel font-mono text-xs">
        NO TELEMETRY TRACES LOADED
      </div>
    );
  }

  // Combine arrays into row objects
  const data = distance.map((d, i) => ({
    dist: Math.round(d),
    speedA: speed[driverA]?.[i] ?? null,
    speedB: speed[driverB]?.[i] ?? null,
    throttleA: throttle[driverA]?.[i] ?? null,
    throttleB: throttle[driverB]?.[i] ?? null,
    brakeA: (brake[driverA]?.[i] ?? 0) ? 100 : 0,
    brakeB: (brake[driverB]?.[i] ?? 0) ? 100 : 0,
    gearA: gear[driverA]?.[i] ?? null,
    gearB: gear[driverB]?.[i] ?? null,
  }));

  const colorA = '#00E5FF'; // Telemetry Cyan
  const colorB = '#FFB800'; // Telemetry Amber

  return (
    <div className="flex flex-col gap-4 font-sans">
      {/* Legend & Channel Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded bg-cockpit-elevated border border-hairline-border px-4 py-2.5 text-xs font-mono">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-6 rounded-sm shadow-[0_0_8px_rgba(0,229,255,0.7)]" style={{ backgroundColor: colorA }} />
            <span className="font-bold text-white tracking-wide">CAR 1: {driverA}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-6 rounded-sm shadow-[0_0_8px_rgba(255,184,0,0.7)]" style={{ backgroundColor: colorB }} />
            <span className="font-bold text-white tracking-wide">CAR 2: {driverB}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-steel">
          <span className="h-1.5 w-1.5 rounded-full bg-personal-best-green animate-pulse" />
          <span>GRID: 20M DISTANCE STEP</span>
        </div>
      </div>

      {/* Speed (km/h) */}
      <div className="rounded border border-hairline-border bg-cockpit-console p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-xs font-mono">
          <span className="font-bold uppercase tracking-wider text-pure-white">
            Velocity Curve (Speed km/h)
          </span>
          <span className="text-[11px] text-muted-steel">GPS DISTANCE ALIGNED</span>
        </div>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E232D" />
              <XAxis dataKey="dist" stroke="#64748B" tick={false} />
              <YAxis domain={['auto', 'auto']} stroke="#64748B" unit=" km/h" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#11141A', borderColor: 'rgba(255,255,255,0.1)', fontSize: '12px', fontFamily: 'monospace' }}
                formatter={(val: any, name: string) => [
                  `${val} km/h`,
                  name === 'speedA' ? driverA : driverB,
                ]}
              />
              <Line type="monotone" dataKey="speedA" stroke={colorA} dot={false} strokeWidth={2.5} className="glow-cyan" />
              <Line type="monotone" dataKey="speedB" stroke={colorB} dot={false} strokeWidth={2.5} className="glow-amber" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Throttle & Brake Channels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Throttle (%) */}
        <div className="rounded border border-hairline-border bg-cockpit-console p-4">
          <div className="mb-2 text-xs font-mono font-bold uppercase tracking-wider text-personal-best-green flex items-center justify-between">
            <span>Throttle Application (%)</span>
            <span className="text-[10px] text-muted-steel font-normal">0 - 100%</span>
          </div>
          <div className="h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E232D" />
                <XAxis dataKey="dist" stroke="#64748B" tick={false} />
                <YAxis domain={[0, 100]} stroke="#64748B" unit="%" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#11141A', borderColor: 'rgba(255,255,255,0.1)', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Line type="monotone" dataKey="throttleA" stroke={colorA} dot={false} strokeWidth={1.8} />
                <Line type="monotone" dataKey="throttleB" stroke={colorB} dot={false} strokeWidth={1.8} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Brake (%) */}
        <div className="rounded border border-hairline-border bg-cockpit-console p-4">
          <div className="mb-2 text-xs font-mono font-bold uppercase tracking-wider text-f1-crimson flex items-center justify-between">
            <span>Braking Application (Binary/Pressure)</span>
            <span className="text-[10px] text-muted-steel font-normal">ON / OFF</span>
          </div>
          <div className="h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E232D" />
                <XAxis dataKey="dist" stroke="#64748B" tick={false} />
                <YAxis domain={[0, 100]} stroke="#64748B" tick={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#11141A', borderColor: 'rgba(255,255,255,0.1)', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Line type="stepAfter" dataKey="brakeA" stroke={colorA} dot={false} strokeWidth={1.8} />
                <Line type="stepAfter" dataKey="brakeB" stroke={colorB} dot={false} strokeWidth={1.8} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Gear (nGear) */}
      <div className="rounded border border-hairline-border bg-cockpit-console p-4">
        <div className="mb-2 text-xs font-mono font-bold uppercase tracking-wider text-pure-white flex items-center justify-between">
          <span>Gear Selection (G1 - G8)</span>
          <span className="text-[10px] text-muted-steel font-normal">TRANSMISSION RATIO</span>
        </div>
        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E232D" />
              <XAxis dataKey="dist" stroke="#64748B" label={{ value: 'Track Distance (m)', position: 'insideBottom', offset: -2, fill: '#64748B', fontSize: 11 }} />
              <YAxis domain={[1, 8]} stroke="#64748B" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#11141A', borderColor: 'rgba(255,255,255,0.1)', fontSize: '11px', fontFamily: 'monospace' }}
              />
              <Line type="stepAfter" dataKey="gearA" stroke={colorA} dot={false} strokeWidth={1.8} />
              <Line type="stepAfter" dataKey="gearB" stroke={colorB} dot={false} strokeWidth={1.8} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
