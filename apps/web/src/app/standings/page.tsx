'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  api,
  DriverStanding,
  ConstructorStanding,
  UpcomingRaceItem,
  DashboardInsightsResponse,
  SeasonChartsResponse,
} from '@/lib/api';
import {
  Trophy,
  Award,
  Calendar,
  ChevronRight,
  MapPin,
  Flag,
  Timer,
  Zap,
  ShieldAlert,
  Cpu,
  Layers,
  Sparkles,
  Gauge,
  TrendingUp,
} from 'lucide-react';
import { DriverAvatar, ConstructorLogo } from '@/components/common/ConstructorLogo';
import { DriverEvolutionCharts } from '@/components/standings/DriverEvolutionCharts';
import { DriverPerformanceGrid } from '@/components/standings/DriverPerformanceGrid';
import { ConstructorCarsGrid } from '@/components/standings/ConstructorCarsGrid';
import { DriverDeepDiveDashboard } from '@/components/standings/DriverDeepDiveDashboard';
import { useDriverModal } from '@/context/DriverModalContext';

export default function StandingsPage() {
  const { openDriver } = useDriverModal();
  const [selectedSeason, setSelectedSeason] = useState<number>(2026);
  const [driverStandings, setDriverStandings] = useState<DriverStanding[]>([]);
  const [constructorStandings, setConstructorStandings] = useState<ConstructorStanding[]>([]);
  const [schedule, setSchedule] = useState<{ recent: UpcomingRaceItem[]; upcoming: UpcomingRaceItem[] }>({
    recent: [],
    upcoming: [],
  });
  const [insights, setInsights] = useState<DashboardInsightsResponse | null>(null);
  const [chartsData, setChartsData] = useState<SeasonChartsResponse | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'drivers' | 'ratings' | 'teams' | 'deep_dive' | 'constructors' | 'schedule'
  >('overview');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [driversRes, constrRes, schedRes, insightsRes, chartsRes] = await Promise.all([
          api.getDriverStandings(selectedSeason),
          api.getConstructorStandings(selectedSeason),
          api.getUpcomingRaces(),
          api.getDashboardInsights(selectedSeason),
          api.getSeasonCharts(selectedSeason),
        ]);
        setDriverStandings(driversRes.standings || []);
        setConstructorStandings(constrRes.standings || []);
        setSchedule(schedRes);
        setInsights(insightsRes);
        setChartsData(chartsRes);
      } catch (err) {
        console.warn('Failed to load standings data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedSeason]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-500">
            <Trophy className="h-4 w-4" />
            <span>F1 RACE INTEL · LIVE DASHBOARD</span>
          </div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white">
            Grand Prix Intelligence & Standings
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Live season progress, fastest pit stops, incident tracking, telemetry stats, and official championships.
          </p>
        </div>

        {/* Season Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Season:
          </label>
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(Number(e.target.value))}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white focus:border-red-500 focus:outline-none"
          >
            {[2026, 2025, 2024, 2023, 2022, 2021].map((s) => (
              <option key={s} value={s}>{s} Championship</option>
            ))}
          </select>
        </div>
      </div>

      {/* Headline Metric Cards (Formula1Dashboard style) */}
      {insights && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Season Completed */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-zinc-400">{insights.season} Schedule</span>
              <Calendar className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">{insights.season_completed_pct}%</div>
            <div className="text-xs text-zinc-400 mt-1">
              {insights.completed_rounds} of {insights.total_rounds} rounds completed
            </div>
            <div className="mt-3 w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-red-500 h-full" style={{ width: `${insights.season_completed_pct}%` }} />
            </div>
          </div>

          {/* Fastest Pit Stop */}
          <Link
            href="/pit-stops"
            className="bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 rounded-xl p-4 transition-all group"
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-zinc-400">Fastest Pit Stop</span>
              <Timer className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-2xl font-black text-amber-400">
              {insights.fastest_pit_stop.duration_s} s
            </div>
            <div className="text-xs text-zinc-300 mt-1 truncate">
              {insights.fastest_pit_stop.driver_name} · R{insights.fastest_pit_stop.round}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              {insights.fastest_pit_stop.race_name} →
            </div>
          </Link>

          {/* Crash Damage & Incident Index */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-zinc-400">Estimated Incident Damage</span>
              <ShieldAlert className="w-4 h-4 text-red-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">
              ${(insights.estimated_damage_cost / 1_000_000).toFixed(2)}M
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              {insights.incidents_dnfs} total race retirements & damage events
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Destructors Championship tracking</div>
          </div>

          {/* Telemetry Analysed */}
          <Link
            href="/telemetry"
            className="bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 rounded-xl p-4 transition-all group"
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-zinc-400">Telemetry Analysis</span>
              <Cpu className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-2xl font-black text-blue-400">
              {insights.telemetry_laps_analyzed} Laps
            </div>
            <div className="text-xs text-zinc-300 mt-1">
              Speed, Throttle, Delta duel traces
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Launch Duel Engine →</div>
          </Link>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="border-b border-zinc-800 overflow-x-auto">
        <nav className="flex space-x-6 whitespace-nowrap min-w-max">
          {[
            { id: 'overview', label: 'Overview & Evolution', icon: Trophy },
            { id: 'drivers', label: 'Driver Standings', icon: Award },
            { id: 'ratings', label: 'Driver Ratings (SPS & TMS)', icon: Sparkles },
            { id: 'teams', label: '2026 Teams & Cars', icon: Cpu },
            { id: 'deep_dive', label: 'Driver Deep Dive', icon: Gauge },
            { id: 'constructors', label: 'Constructors', icon: Zap },
            { id: 'schedule', label: 'Calendar & Schedule', icon: Calendar },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 border-b-2 py-4 text-sm font-semibold transition ${
                  active
                    ? 'border-red-500 text-white'
                    : 'border-transparent text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-red-500' : 'text-zinc-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="mt-8">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-zinc-400">
            Loading championship data...
          </div>
        ) : activeTab === 'overview' ? (
          driverStandings.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-zinc-500 mb-3" />
              <h3 className="text-lg font-bold text-white">Season {selectedSeason} Has Not Started</h3>
              <p className="text-zinc-400 text-sm mt-1 max-w-md mx-auto">
                No race results have been classified yet for the {selectedSeason} championship. Check the Calendar tab to see the schedule.
              </p>
              <button
                onClick={() => setActiveTab('schedule')}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition"
              >
                View {selectedSeason} Calendar
              </button>
            </div>
          ) : (
            <div className="space-y-10">
              {/* Feature 1: Driver Points & Ranking Evolution (Bump Chart) */}
              {chartsData && <DriverEvolutionCharts chartsData={chartsData} />}

              {/* Split Overview: Top 5 Drivers & Top 5 Constructors */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Drivers Top 5 */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-400" />
                      <h3 className="font-bold text-white text-base">Driver Championship Leaders</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('drivers')}
                      className="text-xs text-red-400 hover:underline"
                    >
                      View All ({driverStandings.length})
                    </button>
                  </div>
                  <div className="divide-y divide-zinc-800">
                    {driverStandings.slice(0, 5).map((d) => (
                      <div key={d.driver_id} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 text-center font-bold text-sm ${d.rank === 1 ? 'text-amber-400' : d.rank === 2 ? 'text-zinc-300' : d.rank === 3 ? 'text-amber-600' : 'text-zinc-500'}`}>
                            {d.rank}
                          </span>
                          <DriverAvatar driverCode={d.driver_code} driverName={d.driver_name} size="sm" />
                          <div>
                            <button
                              onClick={() => openDriver(d.driver_code)}
                              className="text-left font-semibold text-white hover:text-red-400 transition-colors"
                            >
                              {d.driver_name}
                            </button>
                            <div className="text-xs text-zinc-400">
                              <ConstructorLogo teamName={d.team_name} size="sm" showName={true} />
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-white text-base">{d.points} PTS</div>
                          <div className="text-xs text-zinc-500">{d.wins} wins · {d.podiums} podiums</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Constructors Top 5 */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <h3 className="font-bold text-white text-base">Constructor Championship Leaders</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('constructors')}
                      className="text-xs text-red-400 hover:underline"
                    >
                      View All ({constructorStandings.length})
                    </button>
                  </div>
                  <div className="divide-y divide-zinc-800">
                    {constructorStandings.slice(0, 5).map((c) => (
                      <div key={c.constructor_id} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 text-center font-bold text-sm ${c.rank === 1 ? 'text-amber-400' : c.rank === 2 ? 'text-zinc-300' : c.rank === 3 ? 'text-amber-600' : 'text-zinc-500'}`}>
                            {c.rank}
                          </span>
                          <ConstructorLogo teamName={c.team_name} size="md" showName={true} />
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-white text-base">{c.points} PTS</div>
                          <div className="text-xs text-zinc-500">{c.wins} wins · {c.podiums} podiums</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        ) : activeTab === 'drivers' ? (
          /* Feature 2: 2026 F1 Driver Standings Table with Points Gap & Evolution Indicators (Image 2) */
          driverStandings.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-12 text-center">
              <Award className="mx-auto h-12 w-12 text-zinc-500 mb-3" />
              <h3 className="text-lg font-bold text-white">No Driver Standings Yet</h3>
              <p className="text-zinc-400 text-sm mt-1">
                The {selectedSeason} season has 0 completed races.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-2xl backdrop-blur">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-300">
                  <thead className="border-b border-zinc-800 bg-zinc-900 text-xs uppercase tracking-wider text-zinc-400">
                    <tr>
                      <th className="px-6 py-4 w-16 text-center">Pos</th>
                      <th className="px-6 py-4">Driver</th>
                      <th className="px-6 py-4">Constructor</th>
                      <th className="px-6 py-4 text-center">Evolution</th>
                      <th className="px-6 py-4 text-right">Points</th>
                      <th className="px-6 py-4 text-center">Wins</th>
                      <th className="px-6 py-4 text-center">Podiums</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {driverStandings.map((driver) => {
                      const evo = driver.evolution ?? 0;
                      return (
                        <tr
                          key={driver.driver_id}
                          className="hover:bg-zinc-800/40 transition-colors"
                        >
                          {/* Pos */}
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-bold ${
                                driver.rank === 1
                                  ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                                  : driver.rank === 2
                                  ? 'bg-zinc-300 text-black'
                                  : driver.rank === 3
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {driver.rank}
                            </span>
                          </td>

                          {/* Driver */}
                          <td className="px-6 py-4 font-medium text-white">
                            <div className="flex items-center gap-3">
                              <DriverAvatar driverCode={driver.driver_code} driverName={driver.driver_name} size="sm" />
                              <div>
                                <button
                                  onClick={() => openDriver(driver.driver_code)}
                                  className="text-left font-bold text-white text-base hover:text-red-400 transition-colors"
                                >
                                  {driver.driver_name}
                                </button>
                                <div>
                                  <span className="text-xs font-mono text-zinc-500">#{driver.driver_code}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Constructor */}
                          <td className="px-6 py-4 text-zinc-300">
                            <ConstructorLogo teamName={driver.team_name} size="sm" showName={true} />
                          </td>

                          {/* Evolution Indicator (^ 1, v 1, -) */}
                          <td className="px-6 py-4 text-center">
                            {evo > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-black text-emerald-400 border border-emerald-500/20">
                                ▲ {evo}
                              </span>
                            ) : evo < 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-0.5 font-mono text-xs font-black text-red-400 border border-red-500/20">
                                ▼ {Math.abs(evo)}
                              </span>
                            ) : (
                              <span className="font-mono text-xs font-bold text-zinc-500">-</span>
                            )}
                          </td>

                          {/* Points + Gap to Leader */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-baseline justify-end gap-2">
                              <span className="font-mono text-lg font-black text-white">
                                {driver.points}
                              </span>
                              {driver.gap_to_leader !== undefined && driver.gap_to_leader !== 0 ? (
                                <span className="font-mono text-xs text-zinc-500 font-semibold">
                                  {driver.gap_to_leader > 0 ? `+${driver.gap_to_leader}` : driver.gap_to_leader}
                                </span>
                              ) : (
                                <span className="font-mono text-[10px] uppercase font-bold text-amber-400/80">
                                  LEADER
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Wins */}
                          <td className="px-6 py-4 text-center font-mono font-bold text-zinc-200">
                            {driver.wins}
                          </td>

                          {/* Podiums */}
                          <td className="px-6 py-4 text-center font-mono text-zinc-300">
                            {driver.podiums}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : activeTab === 'ratings' ? (
          /* Feature 3: Driver Performance Cards Grid (SPS & TMS with Watermark & Cutouts) (Image 3) */
          <DriverPerformanceGrid standings={driverStandings} />
        ) : activeTab === 'teams' ? (
          /* Feature 4: 2026 Constructor Cars & Teams Grid (Image 4) */
          <ConstructorCarsGrid standings={constructorStandings} />
        ) : activeTab === 'deep_dive' ? (
          /* Feature 5: Driver Profile Deep Dive Dashboard (Image 5) */
          <DriverDeepDiveDashboard
            availableDrivers={driverStandings}
            season={selectedSeason}
          />
        ) : activeTab === 'constructors' ? (
          constructorStandings.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-12 text-center">
              <Trophy className="mx-auto h-12 w-12 text-zinc-500 mb-3" />
              <h3 className="text-lg font-bold text-white">No Constructor Standings Yet</h3>
              <p className="text-zinc-400 text-sm mt-1">
                The {selectedSeason} season has 0 completed races.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-300">
                  <thead className="border-b border-zinc-800 bg-zinc-900 text-xs uppercase tracking-wider text-zinc-400">
                    <tr>
                      <th className="px-6 py-4 w-16 text-center">Pos</th>
                      <th className="px-6 py-4">Constructor</th>
                      <th className="px-6 py-4">Nationality</th>
                      <th className="px-6 py-4 text-center">Wins</th>
                      <th className="px-6 py-4 text-center">Podiums</th>
                      <th className="px-6 py-4 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {constructorStandings.map((c) => (
                      <tr
                        key={c.constructor_id}
                        className="hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-bold ${
                              c.rank === 1
                                ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                                : c.rank === 2
                                ? 'bg-zinc-300 text-black'
                                : c.rank === 3
                                ? 'bg-amber-600 text-white'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {c.rank}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-white">
                          <ConstructorLogo teamName={c.team_name} size="md" showName={true} />
                        </td>
                        <td className="px-6 py-4 text-zinc-400">{c.nationality || '--'}</td>
                        <td className="px-6 py-4 text-center font-mono font-bold text-zinc-200">
                          {c.wins}
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-zinc-300">
                          {c.podiums}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-white text-base">
                          {c.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          /* Schedule Tab */
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Grand Prix Race Calendar</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...schedule.recent, ...schedule.upcoming].map((r) => (
                <div
                  key={r.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono font-bold text-red-500">ROUND {r.round}</span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${r.status === 'completed' ? 'bg-zinc-800 text-zinc-300' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {r.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-white text-base">{r.name}</h4>
                    <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-zinc-500" />
                      {r.circuit_name} · {r.country}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-zinc-500" />
                      {r.date || 'TBD'}
                    </div>
                  </div>
                  <Link
                    href={`/races/${r.id}`}
                    className="mt-4 block w-full text-center py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold transition"
                  >
                    View Race Details →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
