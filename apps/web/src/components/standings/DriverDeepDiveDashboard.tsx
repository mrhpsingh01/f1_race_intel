'use client';

import React, { useState, useEffect } from 'react';
import { api, DriverProfileResponse, DriverStanding } from '@/lib/api';
import {
  Trophy,
  Award,
  Zap,
  Gauge,
  Flame,
  UserCheck,
  TrendingUp,
  BarChart2,
  PieChart as PieIcon,
  Flag,
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
import { DriverAvatar, ConstructorLogo } from '@/components/common/ConstructorLogo';

interface DriverDeepDiveDashboardProps {
  initialDriverCode?: string;
  season?: number;
  availableDrivers: DriverStanding[];
}

const DONUT_COLORS = ['#E8002D', '#3B82F6', '#71717A'];

export function DriverDeepDiveDashboard({
  initialDriverCode = 'ANT',
  season = 2026,
  availableDrivers,
}: DriverDeepDiveDashboardProps) {
  const [selectedDriverCode, setSelectedDriverCode] = useState<string>(initialDriverCode);
  const [profile, setProfile] = useState<DriverProfileResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadDriver() {
      setLoading(true);
      try {
        const data = await api.getDriverProfile(selectedDriverCode, season);
        setProfile(data);
      } catch (err) {
        console.warn('Failed to load driver profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDriver();
  }, [selectedDriverCode, season]);

  // Donut data
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
    <div className="space-y-8">
      {/* Driver Selector & Top Profile Header */}
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-6 shadow-2xl">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          {/* Driver Portrait & Bio */}
          <div className="flex items-center gap-5">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-red-500/40 bg-zinc-900 shadow-xl">
              <img
                src={`/images/drivers/${selectedDriverCode.toLowerCase()}.png`}
                alt={profile?.driver.full_name || selectedDriverCode}
                className="h-full w-full object-cover object-top filter contrast-105"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-red-500">
                  #{profile?.driver.car_number || '00'}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  {profile?.driver.nationality || 'Grand Prix Driver'}
                </span>
              </div>
              <h1 className="text-2xl font-black text-white sm:text-3xl">
                {profile?.driver.full_name || selectedDriverCode}
              </h1>
              <div className="mt-1 flex items-center gap-3">
                <ConstructorLogo teamName={profile?.driver.team_name || ''} size="sm" showName={true} />
                <span className="text-xs text-zinc-500">·</span>
                <span className="text-xs text-zinc-400">{season} Championship Profile</span>
              </div>
            </div>
          </div>

          {/* Selector Dropdown & SPS/TMS Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Driver:
              </label>
              <select
                value={selectedDriverCode}
                onChange={(e) => setSelectedDriverCode(e.target.value)}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-bold text-white focus:border-red-500 focus:outline-none"
              >
                {availableDrivers.map((d) => (
                  <option key={d.driver_code} value={d.driver_code}>
                    {d.driver_name} ({d.driver_code})
                  </option>
                ))}
              </select>
            </div>

            {profile && (
              <div className="flex items-center gap-2">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-center shadow">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    SPS [{profile.sps.grade}]
                  </div>
                  <div className="font-mono text-base font-black text-white">
                    {profile.sps.score}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-center shadow">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                    TMS [{profile.tms.grade}]
                  </div>
                  <div className="font-mono text-base font-black text-white">
                    {profile.tms.score}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading || !profile ? (
        <div className="flex h-64 items-center justify-center text-zinc-400">
          Loading {selectedDriverCode} telemetry profile...
        </div>
      ) : (
        <>
          {/* 4 Headline KPI Metric Cards (Image 5 style) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Wins */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Grand Prix Wins
                </span>
                <Trophy className="h-4 w-4 text-amber-400" />
              </div>
              <div className="mt-2 font-mono text-3xl font-black text-white">
                {profile.kpis.wins}
              </div>
              <div className="mt-1 text-xs text-zinc-400">
                {profile.kpis.sprint_wins} Sprint Wins ·{' '}
                {((profile.kpis.wins / Math.max(profile.kpis.races_entered, 1)) * 100).toFixed(0)}% Win Rate
              </div>
            </div>

            {/* Podiums */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Podiums
                </span>
                <Award className="h-4 w-4 text-zinc-300" />
              </div>
              <div className="mt-2 font-mono text-3xl font-black text-white">
                {profile.kpis.podiums}
              </div>
              <div className="mt-1 text-xs text-zinc-400">
                {profile.kpis.sprint_podiums} Sprint Podiums ·{' '}
                {profile.radial_gauge.podiums_pct}% Podium Rate
              </div>
            </div>

            {/* Season Points */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Season Points
                </span>
                <Zap className="h-4 w-4 text-red-500" />
              </div>
              <div className="mt-2 font-mono text-3xl font-black text-white">
                {profile.kpis.points}
              </div>
              <div className="mt-1 text-xs text-zinc-400">
                {profile.kpis.avg_points} PTS / Race Average
              </div>
            </div>

            {/* Laps Led */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Laps Led
                </span>
                <Gauge className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mt-2 font-mono text-3xl font-black text-emerald-400">
                {profile.kpis.laps_led}
              </div>
              <div className="mt-1 text-xs text-zinc-400">
                Across {profile.kpis.races_entered} Classified Races
              </div>
            </div>
          </div>

          {/* Row: Radial Concentric Metric Breakdown + Donut Points Finishes */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Concentric / Gauge Breakdown */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Performance Index
                  </div>
                  <h3 className="text-base font-extrabold text-white">Season Finish Conversion</h3>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-zinc-300">Win Rate</span>
                    <span className="font-mono text-amber-400">{profile.radial_gauge.wins_pct}%</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all duration-500"
                      style={{ width: `${profile.radial_gauge.wins_pct}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-zinc-300">Podium Rate</span>
                    <span className="font-mono text-zinc-200">{profile.radial_gauge.podiums_pct}%</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-zinc-200 transition-all duration-500"
                      style={{ width: `${profile.radial_gauge.podiums_pct}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-zinc-300">Points Finish Rate</span>
                    <span className="font-mono text-emerald-400">{profile.radial_gauge.points_pct}%</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${profile.radial_gauge.points_pct}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-zinc-300">Retirement / DNF Rate</span>
                    <span className="font-mono text-red-400">{profile.radial_gauge.dnf_pct}%</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-500 transition-all duration-500"
                      style={{ width: `${profile.radial_gauge.dnf_pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Donut Chart: Finishes in Points */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-xl">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Reliability & Scoring
                  </div>
                  <h3 className="text-base font-extrabold text-white">Finishes in Points (%)</h3>
                </div>
                <div className="font-mono text-lg font-black text-emerald-400">
                  {profile.finishes_donut.points_finish_pct}%
                </div>
              </div>

              <div className="h-[220px] w-full min-h-[220px]">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
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
                      height={36}
                      formatter={(val) => <span className="text-xs text-zinc-300">{val}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row: Horizontal Finish Positions Distribution + Points vs Previous Season */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Horizontal Bar: Finish Positions Distribution */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-xl">
              <div className="mb-4">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Finishing Position Spread
                </div>
                <h3 className="text-base font-extrabold text-white">Finish Positions Distribution</h3>
                <p className="text-xs text-zinc-400">Total race classifications per position slot</p>
              </div>

              <div className="h-[280px] w-full min-h-[280px]">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={posDistributionData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                    <XAxis type="number" stroke="#71717a" fontSize={11} allowDecimals={false} />
                    <YAxis
                      dataKey="position"
                      type="category"
                      stroke="#a1a1aa"
                      fontSize={11}
                      width={45}
                    />
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

            {/* Points Evolution vs Previous Season */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-xl">
              <div className="mb-4">
                <div className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  Year-over-Year Trajectory
                </div>
                <h3 className="text-base font-extrabold text-white">
                  Points Evolution vs. Previous Season ({season} vs {season - 1})
                </h3>
                <p className="text-xs text-zinc-400">Comparative cumulative points by round</p>
              </div>

              <div className="h-[280px] w-full min-h-[280px]">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart
                    data={profile.points_vs_previous}
                    margin={{ top: 10, right: 15, left: -15, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="round" stroke="#71717a" fontSize={11} />
                    <YAxis stroke="#71717a" fontSize={11} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-xs shadow-xl">
                            <div className="mb-1 font-bold text-white">{label}</div>
                            {payload.map((item: any) => (
                              <div key={item.name} className="flex justify-between gap-4 font-mono">
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
                      name={`${season} Season`}
                      stroke="#E8002D"
                      strokeWidth={3}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey={String(season - 1)}
                      name={`${season - 1} Season`}
                      stroke="#71717A"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={30}
                      formatter={(val) => <span className="text-xs text-zinc-300">{val}</span>}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
