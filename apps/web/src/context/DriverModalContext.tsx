'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import Link from 'next/link';
import { api, DriverProfileResponse } from '@/lib/api';
import {
  X,
  ExternalLink,
  Trophy,
  Award,
  Zap,
  Gauge,
  Flame,
  UserCheck,
  Calendar,
  Layers,
  ChevronRight,
  GitCompare,
  Cpu,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { ConstructorLogo } from '@/components/common/ConstructorLogo';

interface DriverModalContextType {
  openDriver: (driverCode: string, season?: number) => void;
  closeDriver: () => void;
  currentDriver: string | null;
}

const DriverModalContext = createContext<DriverModalContextType>({
  openDriver: () => {},
  closeDriver: () => {},
  currentDriver: null,
});

export const useDriverModal = () => useContext(DriverModalContext);

export function DriverModalProvider({ children }: { children: React.ReactNode }) {
  const [driverCode, setDriverCode] = useState<string | null>(null);
  const [season, setSeason] = useState<number>(2026);
  const [profile, setProfile] = useState<DriverProfileResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const openDriver = (code: string, targetSeason: number = 2026) => {
    if (!code) return;
    setDriverCode(code.toUpperCase().trim());
    setSeason(targetSeason);
  };

  const closeDriver = () => {
    setDriverCode(null);
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDriver();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch driver profile whenever driverCode or season changes
  useEffect(() => {
    if (!driverCode) {
      setProfile(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    api.getDriverProfile(driverCode, season)
      .then((data) => {
        if (isMounted) setProfile(data);
      })
      .catch((err) => {
        console.warn('Failed to load driver profile modal:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [driverCode, season]);

  // Donut chart data
  const donutData = profile
    ? [
        { name: 'In Points', value: profile.finishes_donut.in_points, color: '#22c55e' },
        { name: 'Out of Points', value: profile.finishes_donut.out_of_points, color: '#eab308' },
        { name: 'Retirements (DNF)', value: profile.finishes_donut.dnf, color: '#ef4444' },
      ].filter((d) => d.value > 0)
    : [];

  // Finish positions horizontal bar data
  const posDistributionData = profile
    ? Object.entries(profile.positions_distribution)
        .map(([pos, count]) => ({
          position: pos,
          count: count,
        }))
        .filter((d) => d.count > 0 || ['P1', 'P2', 'P3', 'P4', 'P5'].includes(d.position))
    : [];

  return (
    <DriverModalContext.Provider
      value={{
        openDriver,
        closeDriver,
        currentDriver: driverCode,
      }}
    >
      {children}

      {/* Driver Deep Dive Global Modal */}
      {driverCode && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/90 p-3 sm:p-6 backdrop-blur-md animate-in fade-in duration-200"
          style={{ isolation: 'isolate' }}
          onClick={closeDriver}
        >
          <div
            className="relative w-full max-w-5xl rounded-3xl border border-zinc-800 bg-[#090a0f] p-6 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col z-[10000]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar: Controls */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-500">
                  DRIVER DEEP DIVE INTELLIGENCE
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Season Dropdown */}
                <select
                  value={season}
                  onChange={(e) => setSeason(Number(e.target.value))}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white focus:border-red-500 focus:outline-none"
                >
                  {[2026, 2025, 2024, 2023, 2022, 2021].map((s) => (
                    <option key={s} value={s}>{s} Season</option>
                  ))}
                </select>

                {/* Direct Link to Standalone Profile */}
                <Link
                  href={`/drivers/${driverCode}`}
                  onClick={closeDriver}
                  className="hidden sm:flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:border-zinc-700 transition"
                  title="Open standalone driver page"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Full Page</span>
                </Link>

                {/* Close Button */}
                <button
                  onClick={closeDriver}
                  className="rounded-full bg-zinc-900 p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
                  aria-label="Close driver profile"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="overflow-y-auto pr-1 mt-4 space-y-6 flex-grow">
              {loading ? (
                <div className="flex h-72 items-center justify-center text-zinc-400 font-mono text-sm">
                  Loading {driverCode} telemetry profile...
                </div>
              ) : profile ? (
                <>
                  {/* Hero Driver Header */}
                  <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900/90 to-zinc-950 p-5 shadow-xl">
                    <div className="flex flex-col sm:flex-row items-center gap-5">
                      {/* Driver Portrait Cutout - strictly constrained */}
                      <div className="relative h-24 w-24 min-h-[96px] min-w-[96px] max-h-[96px] max-w-[96px] flex-shrink-0 overflow-hidden rounded-full border-2 border-red-500/60 bg-zinc-900 shadow-2xl">
                        <img
                          src={`/images/drivers/${driverCode.toLowerCase()}.png`}
                          alt={profile.driver.full_name}
                          className="h-full w-full object-cover object-top filter contrast-105 block"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>

                      {/* Driver Bio & Team */}
                      <div className="text-center sm:text-left flex-grow min-w-0">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                          <span className="font-mono text-xs font-black text-red-500">
                            #{profile.driver.car_number || '00'}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                            {profile.driver.nationality || 'Grand Prix Driver'}
                          </span>
                        </div>
                        <h2 className="mt-1 text-2xl sm:text-3xl font-black text-white tracking-tight break-words">
                          {profile.driver.full_name}
                        </h2>
                        <div className="mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                          <ConstructorLogo teamName={profile.driver.team_name} size="sm" showName={true} />
                          <span className="text-xs text-zinc-500">·</span>
                          <span className="text-xs text-zinc-400">{season} Championship Standing</span>
                        </div>
                      </div>

                      {/* SPS & TMS Badges */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 p-3 text-center shadow min-w-[85px]">
                          <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                            <Flame className="h-3 w-3 text-amber-500" />
                            <span>SPS [{profile.sps.grade}]</span>
                          </div>
                          <div className="mt-1 font-mono text-xl font-black text-white">
                            {profile.sps.score}
                          </div>
                          <div className="text-[9px] text-zinc-400 mt-0.5">Performance Score</div>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 p-3 text-center shadow min-w-[85px]">
                          <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-400">
                            <UserCheck className="h-3 w-3 text-blue-500" />
                            <span>TMS [{profile.tms.grade}]</span>
                          </div>
                          <div className="mt-1 font-mono text-xl font-black text-white">
                            {profile.tms.score}
                          </div>
                          <div className="text-[9px] text-zinc-400 mt-0.5">Teammate Duel</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4 Headline KPI Metric Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Wins */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 shadow">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                          GP Wins
                        </span>
                        <Trophy className="h-4 w-4 text-amber-400" />
                      </div>
                      <div className="mt-1 font-mono text-2xl font-black text-white">
                        {profile.kpis.wins}
                      </div>
                      <div className="mt-0.5 text-[11px] text-zinc-400">
                        {((profile.kpis.wins / Math.max(profile.kpis.races_entered, 1)) * 100).toFixed(0)}% Win Rate
                      </div>
                    </div>

                    {/* Podiums */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 shadow">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                          Podiums
                        </span>
                        <Award className="h-4 w-4 text-zinc-300" />
                      </div>
                      <div className="mt-1 font-mono text-2xl font-black text-white">
                        {profile.kpis.podiums}
                      </div>
                      <div className="mt-0.5 text-[11px] text-zinc-400">
                        {profile.radial_gauge.podiums_pct}% Podium Rate
                      </div>
                    </div>

                    {/* Season Points */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 shadow">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                          Season Points
                        </span>
                        <Zap className="h-4 w-4 text-red-500" />
                      </div>
                      <div className="mt-1 font-mono text-2xl font-black text-white">
                        {profile.kpis.points}
                      </div>
                      <div className="mt-0.5 text-[11px] text-zinc-400">
                        {profile.kpis.avg_points} PTS / Race Avg
                      </div>
                    </div>

                    {/* Laps Led */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 shadow">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                          Laps Led
                        </span>
                        <Gauge className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div className="mt-1 font-mono text-2xl font-black text-emerald-400">
                        {profile.kpis.laps_led}
                      </div>
                      <div className="mt-0.5 text-[11px] text-zinc-400">
                        In {profile.kpis.races_entered} Classified Races
                      </div>
                    </div>
                  </div>

                  {/* Finish Conversion Bars & Points Donut */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Finish Conversion */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
                        Season Finish Conversion
                      </div>
                      <div className="space-y-3 pt-1">
                        <div>
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-zinc-300">Win Rate</span>
                            <span className="font-mono text-amber-400">{profile.radial_gauge.wins_pct}%</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${profile.radial_gauge.wins_pct}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-zinc-300">Podium Rate</span>
                            <span className="font-mono text-zinc-200">{profile.radial_gauge.podiums_pct}%</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                            <div className="h-full bg-zinc-200 rounded-full" style={{ width: `${profile.radial_gauge.podiums_pct}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-zinc-300">Points Finish Rate</span>
                            <span className="font-mono text-emerald-400">{profile.radial_gauge.points_pct}%</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${profile.radial_gauge.points_pct}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-zinc-300">Retirement / DNF Rate</span>
                            <span className="font-mono text-red-400">{profile.radial_gauge.dnf_pct}%</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                            <div className="h-full bg-red-500 rounded-full" style={{ width: `${profile.radial_gauge.dnf_pct}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Donut Chart: Finishes in Points */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                          Finishes in Points (%)
                        </span>
                        <span className="font-mono text-sm font-black text-emerald-400">
                          {profile.finishes_donut.points_finish_pct}%
                        </span>
                      </div>
                      <div className="h-[200px] w-full min-h-[200px]">
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={donutData}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={70}
                              paddingAngle={4}
                              dataKey="value"
                              isAnimationActive={false}
                            >
                              {donutData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const data = payload[0];
                                return (
                                  <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-xs shadow-xl">
                                    <span className="font-semibold text-white">{data.name}: </span>
                                    <span className="font-mono font-bold text-emerald-400">{data.value} races</span>
                                  </div>
                                );
                              }}
                            />
                            <Legend
                              verticalAlign="bottom"
                              height={32}
                              formatter={(val) => <span className="text-[11px] text-zinc-300">{val}</span>}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Bar: Finish Positions & Year-over-Year */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Finish Positions */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-2">
                        Finish Positions Distribution
                      </div>
                      <div className="h-[220px] w-full min-h-[220px]">
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart
                            data={posDistributionData}
                            layout="vertical"
                            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                            <XAxis type="number" stroke="#71717a" fontSize={10} allowDecimals={false} />
                            <YAxis dataKey="position" type="category" stroke="#a1a1aa" fontSize={10} width={45} />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null;
                                return (
                                  <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-xs shadow-xl">
                                    <span className="font-bold text-white">{label}: </span>
                                    <span className="font-mono font-bold text-red-400">{payload[0].value} times</span>
                                  </div>
                                );
                              }}
                            />
                            <Bar dataKey="count" fill="#E8002D" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* YoY Progression */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-2">
                        Points Trajectory ({season} vs {season - 1})
                      </div>
                      <div className="h-[220px] w-full min-h-[220px]">
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart
                            data={profile.points_vs_previous}
                            margin={{ top: 5, right: 15, left: -15, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                            <XAxis dataKey="round" stroke="#71717a" fontSize={10} />
                            <YAxis stroke="#71717a" fontSize={10} />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null;
                                return (
                                  <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-xs shadow-xl font-mono">
                                    <div className="font-bold text-white mb-1">{label}</div>
                                    {payload.map((item: any) => (
                                      <div key={item.name} className="flex justify-between gap-3">
                                        <span style={{ color: item.color }}>{item.name}:</span>
                                        <span className="font-bold text-white">{item.value ?? '--'} PTS</span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey={String(season)}
                              name={`${season}`}
                              stroke="#E8002D"
                              strokeWidth={2.5}
                              dot={false}
                              isAnimationActive={false}
                            />
                            <Line
                              type="monotone"
                              dataKey={String(season - 1)}
                              name={`${season - 1}`}
                              stroke="#71717A"
                              strokeWidth={1.5}
                              strokeDasharray="4 4"
                              dot={false}
                              isAnimationActive={false}
                            />
                            <Legend
                              verticalAlign="bottom"
                              height={28}
                              formatter={(val) => <span className="text-[11px] text-zinc-300">{val} Season</span>}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Quick-Action Shortcuts */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/telemetry?driver_a=${driverCode}`}
                        onClick={closeDriver}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-400 hover:bg-blue-500/20 transition"
                      >
                        <Cpu className="h-3.5 w-3.5" />
                        <span>Launch Telemetry Duel</span>
                      </Link>

                      <Link
                        href={`/head-to-head?driver_a=${driverCode}`}
                        onClick={closeDriver}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:text-white hover:border-zinc-600 transition"
                      >
                        <GitCompare className="h-3.5 w-3.5" />
                        <span>Compare Head to Head</span>
                      </Link>

                      <Link
                        href="/standings"
                        onClick={closeDriver}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:text-white hover:border-zinc-600 transition"
                      >
                        <Trophy className="h-3.5 w-3.5" />
                        <span>View Championship Standings</span>
                      </Link>
                    </div>

                    <div className="text-[11px] font-mono text-zinc-500">
                      Press <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">Esc</kbd> to exit
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-zinc-400">
                  Driver profile data not available for {driverCode}.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DriverModalContext.Provider>
  );
}
