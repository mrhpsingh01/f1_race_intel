'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { SeasonChartsResponse } from '@/lib/api';
import { Trophy, TrendingUp, Layers } from 'lucide-react';

export const DRIVER_LINE_COLORS: Record<string, string> = {
  ANT: '#27F4D2',
  RUS: '#00D2BE',
  HAM: '#E8002D',
  LEC: '#FF3B30',
  VER: '#3671C6',
  NOR: '#FF8000',
  PIA: '#FFB020',
  HAD: '#4E88E4',
  LAW: '#6692FF',
  SAI: '#00A0DE',
  ALO: '#229971',
  ALB: '#0072CE',
  GAS: '#0093CC',
  COL: '#38BDF8',
  BEA: '#E2E8F0',
  OCO: '#94A3B8',
  HUL: '#F50537',
  BOR: '#EF4444',
  TSU: '#818CF8',
  STR: '#10B981',
  BOT: '#EAB308',
  PER: '#F59E0B',
  LIN: '#A78BFA',
};

interface DriverEvolutionChartsProps {
  chartsData: SeasonChartsResponse;
}

export function DriverEvolutionCharts({ chartsData }: DriverEvolutionChartsProps) {
  const [hoveredDriver, setHoveredDriver] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'top5' | 'top10' | 'all'>('top5');

  const { points_progression = [], ranking_progression = [], round_meta = [], top_driver_codes = [], all_driver_codes = [] } = chartsData;

  const activeDriverCodes =
    filterMode === 'top5'
      ? top_driver_codes.slice(0, 5)
      : filterMode === 'top10'
      ? (all_driver_codes.length > 0 ? all_driver_codes.slice(0, 10) : top_driver_codes.slice(0, 10))
      : all_driver_codes.length > 0
      ? all_driver_codes.slice(0, 18)
      : top_driver_codes;

  // Custom Tick for Flag + Round
  const renderFlagTick = (tickProps: any) => {
    const { x, y, payload } = tickProps;
    const index = payload.index;
    const meta = round_meta[index];
    const flag = meta?.flag || '🏁';
    const label = payload.value; // e.g. "R1"

    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={14} textAnchor="middle" fontSize={14} fill="#ffffff">
          {flag}
        </text>
        <text x={0} y={28} textAnchor="middle" fontSize={10} fill="#71717a" fontWeight="500">
          {label}
        </text>
      </g>
    );
  };

  return (
    <div className="space-y-8">
      {/* Chart Filter Control */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-red-500" />
          <h2 className="text-lg font-bold text-white">Championship Progression Dynamics</h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">Display:</span>
          {(['top5', 'top10', 'all'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold uppercase tracking-wider transition ${
                filterMode === mode
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              {mode === 'top5' ? 'Top 5' : mode === 'top10' ? 'Top 10' : 'All Drivers'}
            </button>
          ))}
        </div>
      </div>

      {/* Side-by-side progression charts */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* 1. Driver Points Evolution */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-xl backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
                <Trophy className="h-3.5 w-3.5" />
                <span>Points Trajectory</span>
              </div>
              <h3 className="mt-0.5 text-base font-extrabold text-white">Driver Points Evolution</h3>
              <p className="text-xs text-zinc-400">Cumulative World Championship points race-by-race</p>
            </div>
          </div>

          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points_progression} margin={{ top: 15, right: 15, left: -15, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="round"
                  tick={renderFlagTick}
                  interval={0}
                  height={45}
                  stroke="#3f3f46"
                />
                <YAxis stroke="#71717a" fontSize={11} domain={[0, 'auto']} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const roundMetaItem = round_meta.find((r) => `R${r.round}` === label);
                    return (
                      <div className="rounded-xl border border-zinc-700 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur">
                        <div className="mb-2 border-b border-zinc-800 pb-1.5 text-xs font-bold text-white flex items-center justify-between gap-4">
                          <span>
                            {roundMetaItem?.flag} {roundMetaItem?.name || label} GP
                          </span>
                          <span className="text-zinc-400 font-mono text-[10px]">{label}</span>
                        </div>
                        <div className="space-y-1">
                          {payload
                            .filter((item: any) => activeDriverCodes.includes(item.dataKey))
                            .sort((a: any, b: any) => (b.value || 0) - (a.value || 0))
                            .map((item: any) => (
                              <div
                                key={item.dataKey}
                                className="flex items-center justify-between gap-4 text-xs font-medium"
                              >
                                <span className="flex items-center gap-1.5" style={{ color: item.color }}>
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                                  {item.dataKey}
                                </span>
                                <span className="font-mono font-bold text-white">{item.value} PTS</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  }}
                />
                {activeDriverCodes.map((code) => {
                  const color = DRIVER_LINE_COLORS[code] || '#94a3b8';
                  const isHovered = hoveredDriver === code;
                  const isDimmed = hoveredDriver !== null && !isHovered;

                  return (
                    <Line
                      key={code}
                      type="monotone"
                      dataKey={code}
                      stroke={color}
                      strokeWidth={isHovered ? 3.5 : 2}
                      strokeOpacity={isDimmed ? 0.2 : 1}
                      dot={false}
                      activeDot={{ r: 5, stroke: '#ffffff', strokeWidth: 2 }}
                      onMouseEnter={() => setHoveredDriver(code)}
                      onMouseLeave={() => setHoveredDriver(null)}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Driver Legend Pills */}
          <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-zinc-800/60">
            {activeDriverCodes.map((code) => (
              <button
                key={code}
                onMouseEnter={() => setHoveredDriver(code)}
                onMouseLeave={() => setHoveredDriver(null)}
                className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold transition ${
                  hoveredDriver === code
                    ? 'bg-zinc-800 text-white shadow-md'
                    : 'bg-zinc-900/90 text-zinc-400 hover:text-white'
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: DRIVER_LINE_COLORS[code] || '#94a3b8' }}
                />
                <span>{code}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Driver Ranking Evolution (Bump Chart) */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-xl backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Championship Positions</span>
              </div>
              <h3 className="mt-0.5 text-base font-extrabold text-white">Driver Ranking Evolution (Bump Chart)</h3>
              <p className="text-xs text-zinc-400">Standings position change across each Grand Prix round</p>
            </div>
          </div>

          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ranking_progression} margin={{ top: 15, right: 35, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="round"
                  tick={renderFlagTick}
                  interval={0}
                  height={45}
                  stroke="#3f3f46"
                />
                <YAxis
                  stroke="#71717a"
                  fontSize={11}
                  reversed={true}
                  domain={[1, 20]}
                  ticks={[1, 5, 10, 15, 20]}
                  tickFormatter={(val) => `P${val}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const roundMetaItem = round_meta.find((r) => `R${r.round}` === label);
                    return (
                      <div className="rounded-xl border border-zinc-700 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur">
                        <div className="mb-2 border-b border-zinc-800 pb-1.5 text-xs font-bold text-white flex items-center justify-between gap-4">
                          <span>
                            {roundMetaItem?.flag} {roundMetaItem?.name || label} GP
                          </span>
                          <span className="text-zinc-400 font-mono text-[10px]">{label}</span>
                        </div>
                        <div className="space-y-1">
                          {payload
                            .filter((item: any) => activeDriverCodes.includes(item.dataKey))
                            .sort((a: any, b: any) => (a.value || 0) - (b.value || 0))
                            .map((item: any) => (
                              <div
                                key={item.dataKey}
                                className="flex items-center justify-between gap-4 text-xs font-medium"
                              >
                                <span className="flex items-center gap-1.5" style={{ color: item.color }}>
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                                  {item.dataKey}
                                </span>
                                <span className="font-mono font-bold text-emerald-400">P{item.value}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  }}
                />
                {activeDriverCodes.map((code) => {
                  const color = DRIVER_LINE_COLORS[code] || '#94a3b8';
                  const isHovered = hoveredDriver === code;
                  const isDimmed = hoveredDriver !== null && !isHovered;

                  return (
                    <Line
                      key={code}
                      type="monotone"
                      dataKey={code}
                      stroke={color}
                      strokeWidth={isHovered ? 3.5 : 2}
                      strokeOpacity={isDimmed ? 0.15 : 1}
                      dot={{ r: 2.5, fill: color }}
                      activeDot={{ r: 5, stroke: '#ffffff', strokeWidth: 2 }}
                      onMouseEnter={() => setHoveredDriver(code)}
                      onMouseLeave={() => setHoveredDriver(null)}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Bump Chart Legend */}
          <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-zinc-800/60">
            {activeDriverCodes.map((code) => (
              <button
                key={code}
                onMouseEnter={() => setHoveredDriver(code)}
                onMouseLeave={() => setHoveredDriver(null)}
                className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold transition ${
                  hoveredDriver === code
                    ? 'bg-zinc-800 text-white shadow-md'
                    : 'bg-zinc-900/90 text-zinc-400 hover:text-white'
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: DRIVER_LINE_COLORS[code] || '#94a3b8' }}
                />
                <span>{code}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
