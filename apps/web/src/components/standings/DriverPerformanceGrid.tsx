'use client';

import React, { useState } from 'react';
import { DriverStanding } from '@/lib/api';
import { Shield, Sparkles, UserCheck, Flame, ArrowUpDown } from 'lucide-react';
import { ConstructorLogo } from '@/components/common/ConstructorLogo';

interface DriverPerformanceGridProps {
  standings: DriverStanding[];
}

interface PerformanceMetric {
  driverCode: string;
  driverNumber: string;
  sps: number;
  spsGrade: string;
  tms: number;
  tmsGrade: string;
  championshipImpact: number;
  qualifyingPace: number;
  racecraft: number;
  reliability: number;
  teammateCode: string;
  raceH2H: string;
  qualiH2H: string;
}

const DRIVER_METRICS_MAP: Record<string, Partial<PerformanceMetric>> = {
  ANT: { driverNumber: '12', sps: 94.2, spsGrade: 'A+', tms: 88.4, tmsGrade: 'A', championshipImpact: 98, qualifyingPace: 92, racecraft: 95, reliability: 93, teammateCode: 'RUS', raceH2H: '11 - 6', qualiH2H: '10 - 7' },
  RUS: { driverNumber: '63', sps: 89.1, spsGrade: 'A', tms: 76.5, tmsGrade: 'B+', championshipImpact: 90, qualifyingPace: 91, racecraft: 88, reliability: 89, teammateCode: 'ANT', raceH2H: '6 - 11', qualiH2H: '7 - 10' },
  LEC: { driverNumber: '16', sps: 88.6, spsGrade: 'A', tms: 84.1, tmsGrade: 'A', championshipImpact: 91, qualifyingPace: 95, racecraft: 89, reliability: 82, teammateCode: 'HAM', raceH2H: '12 - 5', qualiH2H: '13 - 4' },
  HAM: { driverNumber: '44', sps: 83.2, spsGrade: 'A-', tms: 68.4, tmsGrade: 'B', championshipImpact: 84, qualifyingPace: 82, racecraft: 86, reliability: 88, teammateCode: 'LEC', raceH2H: '5 - 12', qualiH2H: '4 - 13' },
  VER: { driverNumber: '1', sps: 91.5, spsGrade: 'A+', tms: 95.0, tmsGrade: 'A+', championshipImpact: 93, qualifyingPace: 94, racecraft: 96, reliability: 85, teammateCode: 'HAD', raceH2H: '15 - 2', qualiH2H: '16 - 1' },
  NOR: { driverNumber: '4', sps: 90.0, spsGrade: 'A', tms: 81.3, tmsGrade: 'A-', championshipImpact: 92, qualifyingPace: 93, racecraft: 90, reliability: 87, teammateCode: 'PIA', raceH2H: '10 - 7', qualiH2H: '11 - 6' },
  PIA: { driverNumber: '81', sps: 86.4, spsGrade: 'A', tms: 78.0, tmsGrade: 'B+', championshipImpact: 88, qualifyingPace: 89, racecraft: 87, reliability: 86, teammateCode: 'NOR', raceH2H: '7 - 10', qualiH2H: '6 - 11' },
  SAI: { driverNumber: '55', sps: 81.7, spsGrade: 'A-', tms: 74.2, tmsGrade: 'B+', championshipImpact: 80, qualifyingPace: 82, racecraft: 84, reliability: 83, teammateCode: 'ALB', raceH2H: '9 - 8', qualiH2H: '10 - 7' },
  ALB: { driverNumber: '23', sps: 79.5, spsGrade: 'B+', tms: 72.8, tmsGrade: 'B', championshipImpact: 78, qualifyingPace: 81, racecraft: 80, reliability: 81, teammateCode: 'SAI', raceH2H: '8 - 9', qualiH2H: '7 - 10' },
  ALO: { driverNumber: '14', sps: 82.0, spsGrade: 'A-', tms: 87.5, tmsGrade: 'A', championshipImpact: 81, qualifyingPace: 83, racecraft: 88, reliability: 79, teammateCode: 'STR', raceH2H: '14 - 3', qualiH2H: '15 - 2' },
  STR: { driverNumber: '18', sps: 64.3, spsGrade: 'C', tms: 38.0, tmsGrade: 'D', championshipImpact: 60, qualifyingPace: 65, racecraft: 68, reliability: 72, teammateCode: 'ALO', raceH2H: '3 - 14', qualiH2H: '2 - 15' },
  GAS: { driverNumber: '10', sps: 77.8, spsGrade: 'B+', tms: 75.0, tmsGrade: 'B+', championshipImpact: 76, qualifyingPace: 79, racecraft: 78, reliability: 78, teammateCode: 'COL', raceH2H: '10 - 7', qualiH2H: '11 - 6' },
  COL: { driverNumber: '43', sps: 74.5, spsGrade: 'B', tms: 68.2, tmsGrade: 'B', championshipImpact: 73, qualifyingPace: 76, racecraft: 75, reliability: 76, teammateCode: 'GAS', raceH2H: '7 - 10', qualiH2H: '6 - 11' },
  HUL: { driverNumber: '27', sps: 80.2, spsGrade: 'A-', tms: 82.4, tmsGrade: 'A-', championshipImpact: 79, qualifyingPace: 84, racecraft: 81, reliability: 78, teammateCode: 'BOR', raceH2H: '11 - 6', qualiH2H: '12 - 5' },
  BOR: { driverNumber: '5', sps: 72.1, spsGrade: 'B', tms: 65.0, tmsGrade: 'B-', championshipImpact: 70, qualifyingPace: 73, racecraft: 72, reliability: 75, teammateCode: 'HUL', raceH2H: '6 - 11', qualiH2H: '5 - 12' },
  BEA: { driverNumber: '87', sps: 76.0, spsGrade: 'B+', tms: 71.5, tmsGrade: 'B', championshipImpact: 74, qualifyingPace: 77, racecraft: 78, reliability: 76, teammateCode: 'OCO', raceH2H: '9 - 8', qualiH2H: '9 - 8' },
  OCO: { driverNumber: '31', sps: 75.8, spsGrade: 'B', tms: 70.2, tmsGrade: 'B', championshipImpact: 73, qualifyingPace: 76, racecraft: 77, reliability: 77, teammateCode: 'BEA', raceH2H: '8 - 9', qualiH2H: '8 - 9' },
  HAD: { driverNumber: '37', sps: 73.0, spsGrade: 'B', tms: 45.0, tmsGrade: 'C', championshipImpact: 71, qualifyingPace: 75, racecraft: 72, reliability: 74, teammateCode: 'VER', raceH2H: '2 - 15', qualiH2H: '1 - 16' },
  LAW: { driverNumber: '30', sps: 77.2, spsGrade: 'B+', tms: 74.0, tmsGrade: 'B+', championshipImpact: 75, qualifyingPace: 78, racecraft: 78, reliability: 77, teammateCode: 'TSU', raceH2H: '9 - 8', qualiH2H: '8 - 9' },
  TSU: { driverNumber: '22', sps: 76.5, spsGrade: 'B+', tms: 73.1, tmsGrade: 'B+', championshipImpact: 74, qualifyingPace: 79, racecraft: 77, reliability: 76, teammateCode: 'LAW', raceH2H: '8 - 9', qualiH2H: '9 - 8' },
  BOT: { driverNumber: '77', sps: 75.0, spsGrade: 'B', tms: 76.2, tmsGrade: 'B+', championshipImpact: 72, qualifyingPace: 76, racecraft: 76, reliability: 78, teammateCode: 'PER', raceH2H: '10 - 7', qualiH2H: '11 - 6' },
  PER: { driverNumber: '11', sps: 72.8, spsGrade: 'B-', tms: 66.4, tmsGrade: 'B-', championshipImpact: 70, qualifyingPace: 72, racecraft: 75, reliability: 75, teammateCode: 'BOT', raceH2H: '7 - 10', qualiH2H: '6 - 11' },
  LIN: { driverNumber: '41', sps: 71.0, spsGrade: 'B-', tms: 63.5, tmsGrade: 'C+', championshipImpact: 69, qualifyingPace: 72, racecraft: 72, reliability: 72, teammateCode: 'TSU', raceH2H: '5 - 12', qualiH2H: '4 - 13' },
};

import { useDriverModal } from '@/context/DriverModalContext';

export function DriverPerformanceGrid({ standings }: DriverPerformanceGridProps) {
  const [sortBy, setSortBy] = useState<'sps' | 'tms' | 'points' | 'rank'>('sps');
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const { openDriver } = useDriverModal();

  // Merge standings with metric definitions
  const driversWithMetrics = standings.map((s) => {
    const code = s.driver_code.toUpperCase();
    const defaults = DRIVER_METRICS_MAP[code] || {
      driverNumber: String(s.rank),
      sps: Math.max(50, Math.min(96, 55 + s.points * 0.15 + s.wins * 3)),
      spsGrade: s.points > 200 ? 'A+' : s.points > 100 ? 'A' : s.points > 40 ? 'B+' : 'B',
      tms: Math.max(50, Math.min(95, 60 + s.wins * 4)),
      tmsGrade: s.points > 150 ? 'A' : 'B',
      championshipImpact: 75,
      qualifyingPace: 75,
      racecraft: 75,
      reliability: 80,
      teammateCode: 'N/A',
      raceH2H: '8 - 8',
      qualiH2H: '8 - 8',
    };

    return {
      ...s,
      metrics: defaults,
    };
  });

  // Sorting
  const sortedDrivers = [...driversWithMetrics].sort((a, b) => {
    if (sortBy === 'sps') return (b.metrics.sps || 0) - (a.metrics.sps || 0);
    if (sortBy === 'tms') return (b.metrics.tms || 0) - (a.metrics.tms || 0);
    if (sortBy === 'points') return b.points - a.points;
    return a.rank - b.rank;
  });

  return (
    <div className="space-y-6">
      {/* Header & Sort Controls */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-500">
            <Sparkles className="h-4 w-4" />
            <span>Telemetry & Driver Index</span>
          </div>
          <h2 className="text-xl font-black text-white">Season Performance & Teammate Scores</h2>
          <p className="text-xs text-zinc-400">
            Comprehensive SPS (Season Performance Score) & TMS (Teammate Score) ratings · Click any driver to open deep dive
          </p>
        </div>

        {/* Sort Filter */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-zinc-400" />
          <span className="text-xs text-zinc-400">Sort By:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white focus:border-red-500 focus:outline-none"
          >
            <option value="sps">Season Performance Score (SPS)</option>
            <option value="tms">Teammate Score (TMS)</option>
            <option value="points">Championship Points</option>
            <option value="rank">Championship Position</option>
          </select>
        </div>
      </div>

      {/* 3-Column Card Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sortedDrivers.map((driver) => {
          const code = driver.driver_code.toUpperCase();
          const metrics = driver.metrics;
          const photoPath = `/images/drivers/${code.toLowerCase()}.png`;

          return (
            <div
              key={driver.driver_id}
              onClick={() => openDriver(code)}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-5 shadow-xl transition-all duration-300 hover:border-red-500/60 hover:shadow-2xl hover:shadow-red-950/30"
              title={`Click to view ${driver.driver_name} profile`}
            >
              {/* Background Watermark: Huge Car Number and subtle gradient */}
              <div className="pointer-events-none absolute -bottom-6 -left-3 select-none font-mono text-8xl font-black text-zinc-800/20 transition-all duration-300 group-hover:text-zinc-700/25">
                {metrics.driverNumber || driver.rank}
              </div>

              {/* Top Row: Driver details & team */}
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    Pos #{driver.rank} · {driver.nationality || 'F1'}
                  </div>
                  <h3 className="mt-0.5 text-lg font-black tracking-tight text-white group-hover:text-red-400 transition-colors">
                    {driver.driver_name}
                  </h3>
                  <div className="mt-1">
                    <ConstructorLogo teamName={driver.team_name} size="sm" showName={true} />
                  </div>
                </div>

                {/* Driver Number Badge */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 text-center backdrop-blur">
                  <div className="font-mono text-xs font-black text-red-500">#{metrics.driverNumber}</div>
                  <div className="text-[9px] font-bold text-zinc-500">{code}</div>
                </div>
              </div>

              {/* Middle Section: Driver Official Cutout Portrait */}
              <div className="relative z-10 mt-4 flex items-center justify-center">
                <div className="relative h-44 w-44 overflow-hidden rounded-full border-2 border-zinc-800/80 bg-zinc-900/40 p-2 shadow-inner group-hover:border-zinc-700 transition-colors">
                  <img
                    src={photoPath}
                    alt={driver.driver_name}
                    className="h-full w-full object-cover object-top filter contrast-105 drop-shadow-lg transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      // Fallback to placeholder if image fails
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>

              {/* SPS & TMS Score Highlights (Matching User's Screenshot) */}
              <div className="relative z-10 mt-5 grid grid-cols-2 gap-3">
                {/* SPS Badge */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 p-3 shadow">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                      <Flame className="h-3 w-3 text-amber-500" />
                      SPS
                    </span>
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] font-black text-amber-400 border border-amber-500/20">
                      [{metrics.spsGrade}]
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-xl font-black text-white">{metrics.sps?.toFixed(1)}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">Season Performance</div>
                </div>

                {/* TMS Badge */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 p-3 shadow">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                      <UserCheck className="h-3 w-3 text-blue-500" />
                      TMS
                    </span>
                    <span className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-[10px] font-black text-blue-400 border border-blue-500/20">
                      [{metrics.tmsGrade}]
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-xl font-black text-white">{metrics.tms?.toFixed(1)}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">Teammate Duel Score</div>
                </div>
              </div>

              {/* Category Breakdown (Mini bars) */}
              <div className="relative z-10 mt-4 space-y-2 rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-3 text-[11px]">
                <div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Championship Impact</span>
                    <span className="font-mono text-white">{metrics.championshipImpact}%</span>
                  </div>
                  <div className="mt-1 h-1 w-full rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-red-500"
                      style={{ width: `${metrics.championshipImpact}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Qualifying Speed</span>
                    <span className="font-mono text-white">{metrics.qualifyingPace}%</span>
                  </div>
                  <div className="mt-1 h-1 w-full rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${metrics.qualifyingPace}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between border-t border-zinc-800/80 pt-2 text-[10px] text-zinc-400">
                  <span>
                    Teammate ({metrics.teammateCode}): Race <strong className="text-white">{metrics.raceH2H}</strong>
                  </span>
                  <span>
                    Quali <strong className="text-white">{metrics.qualiH2H}</strong>
                  </span>
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="relative z-10 mt-3 flex items-center justify-between border-t border-zinc-800/40 pt-2 text-xs">
                <span className="font-bold text-white font-mono">{driver.points} PTS</span>
                <span className="text-[11px] text-zinc-400">
                  {driver.wins} wins · {driver.podiums} podiums
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
