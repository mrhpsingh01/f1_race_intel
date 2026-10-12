'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  api,
  DriverStanding,
  ConstructorStanding,
  UpcomingRacesResponse,
  DashboardInsightsResponse,
  SeasonChartsResponse,
} from '@/lib/api';
import {
  Trophy,
  Calendar,
  Clock,
  ChevronRight,
  TrendingUp,
  Award,
  Sparkles,
  Cpu,
  GitCompare,
  Wrench,
  Flag,
  MapPin,
  Timer,
  ShieldAlert,
  Radio,
  Activity,
  Wind,
  Thermometer,
  Zap,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import CircuitTrackOutline from '@/components/circuits/CircuitTrackOutline';
import CircuitWorldMap from '@/components/circuits/CircuitWorldMap';
import { DriverAvatar, ConstructorLogo } from '@/components/common/ConstructorLogo';
import { useDriverModal } from '@/context/DriverModalContext';

const SEASONS = [2026, 2025, 2024, 2023, 2022, 2021];

const DRIVER_COLORS: Record<string, string> = {
  VER: '#3671C6',
  NOR: '#FF8000',
  LEC: '#E8002D',
  PIA: '#FF8000',
  HAM: '#E8002D',
  RUS: '#27F4D2',
  SAI: '#00A0DE',
  PER: '#3671C6',
  ALO: '#229971',
  STR: '#229971',
  GAS: '#0093CC',
  OCO: '#B6BABD',
  ALB: '#00A0DE',
  TSU: '#6692FF',
  HUL: '#B6BABD',
  BOT: '#52E252',
  ZHO: '#52E252',
  MAG: '#B6BABD',
  SAR: '#00A0DE',
  RIC: '#6692FF',
  BEA: '#E8002D',
  COL: '#00A0DE',
  ANT: '#27F4D2',
  DOO: '#0093CC',
  LAW: '#6692FF',
};

const CONSTRUCTOR_COLORS: Record<string, string> = {
  'Red Bull': '#3671C6',
  'Red Bull Racing': '#3671C6',
  'McLaren': '#FF8000',
  'Ferrari': '#E8002D',
  'Mercedes': '#27F4D2',
  'Aston Martin': '#229971',
  'Alpine': '#0093CC',
  'Williams': '#00A0DE',
  'RB': '#6692FF',
  'Kick Sauber': '#52E252',
  'Haas': '#B6BABD',
  'Haas F1 Team': '#B6BABD',
};

// Estimated Destructors Championship (Damage Matrix)
const DESTRUCTORS_DATA = [
  { team: 'Williams', cost_m: 4.8, incidents: 6, primary: 'Chassis & Floor' },
  { team: 'Haas', cost_m: 3.9, incidents: 5, primary: 'Front Wing & Suspension' },
  { team: 'Red Bull Racing', cost_m: 3.4, incidents: 4, primary: 'Sidepod & Floor' },
  { team: 'Alpine', cost_m: 3.1, incidents: 4, primary: 'Gearbox & Wing' },
  { team: 'Ferrari', cost_m: 2.7, incidents: 3, primary: 'Front Wing Assembly' },
  { team: 'Mercedes', cost_m: 1.8, incidents: 2, primary: 'Brake Ducts' },
  { team: 'McLaren', cost_m: 1.6, incidents: 2, primary: 'Diffuser' },
];

export default function HomePage() {
  const { openDriver } = useDriverModal();
  const [selectedSeason, setSelectedSeason] = useState<number>(2026);
  const [driverStandings, setDriverStandings] = useState<DriverStanding[]>([]);
  const [constructorStandings, setConstructorStandings] = useState<ConstructorStanding[]>([]);
  const [schedule, setSchedule] = useState<UpcomingRacesResponse>({
    recent: [],
    upcoming: [],
  });
  const [insights, setInsights] = useState<DashboardInsightsResponse | null>(null);
  const [chartsData, setChartsData] = useState<SeasonChartsResponse | null>(null);
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
          api.getSeasonCharts(selectedSeason).catch(() => null),
        ]);
        setDriverStandings(driversRes.standings || []);
        setConstructorStandings(constrRes.standings || []);
        setSchedule(schedRes);
        setInsights(insightsRes);
        setChartsData(chartsRes);
      } catch (err) {
        console.warn('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedSeason]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 font-sans">
      {/* TOP COCKPIT HUD & ENVIRONMENTAL TELEMETRY BAR */}
      <div className="mb-6 rounded border border-hairline-border bg-cockpit-console/95 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-f1-crimson">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-personal-best-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-personal-best-green"></span>
              </span>
              <span>PITWALL.OS // TRACKSIDE TELEMETRY RIG</span>
              <span className="text-muted-steel">·</span>
              <span className="text-telemetry-cyan font-semibold">COCKPIT CONSOLE 01</span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-pure-white md:text-3xl">
              {selectedSeason} Formula 1 Intelligence Cockpit
            </h1>
            <p className="mt-0.5 text-xs text-muted-steel">
              High-density telemetry curves, driver deltas, championship title fight progression, and podium probability.
            </p>
          </div>

          {/* Environmental HUD & Season Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 rounded bg-cockpit-elevated border border-hairline-border px-3 py-1.5 font-mono text-[11px] text-muted-steel">
              <div className="flex items-center gap-1.5 text-zinc-300">
                <Thermometer className="h-3.5 w-3.5 text-amber-400" />
                <span>AIR <strong className="text-pure-white">29.4°C</strong></span>
              </div>
              <span>|</span>
              <div className="flex items-center gap-1.5 text-zinc-300">
                <Activity className="h-3.5 w-3.5 text-f1-crimson" />
                <span>TRACK <strong className="text-pure-white">37.8°C</strong></span>
              </div>
              <span>|</span>
              <div className="flex items-center gap-1.5 text-zinc-300">
                <Wind className="h-3.5 w-3.5 text-telemetry-cyan" />
                <span>WIND <strong className="text-pure-white">8.4 km/h</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="font-mono text-xs font-bold uppercase tracking-wider text-muted-steel">
                SEASON:
              </label>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(Number(e.target.value))}
                className="rounded border border-hairline-border bg-cockpit-elevated px-3 py-1.5 font-mono text-xs font-bold text-pure-white focus:border-telemetry-cyan focus:outline-none transition-colors"
              >
                {SEASONS.map((s) => (
                  <option key={s} value={s}>
                    {s} {s === 2026 ? '(Current Live)' : 'Season'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* TOP HEADLINE KPI METRIC CARDS */}
      {insights && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          <div className="bg-cockpit-console border border-hairline-border rounded p-4 relative overflow-hidden group hover:border-hairline-border/80 transition-all">
            <div className="flex justify-between items-start">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-steel">
                {insights.season} Calendar Progress
              </span>
              <Calendar className="w-4 h-4 text-f1-crimson" />
            </div>
            <div className="mt-1.5 font-mono text-3xl font-black text-pure-white tabular-nums">
              {insights.season_completed_pct}%
            </div>
            <div className="text-xs text-muted-steel mt-1 font-mono">
              <span className="font-semibold text-pure-white">{insights.completed_rounds}</span> of {insights.total_rounds} rounds completed
            </div>
            <div className="mt-2.5 w-full bg-cockpit-panel rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-f1-crimson h-full transition-all duration-500"
                style={{ width: `${insights.season_completed_pct}%` }}
              />
            </div>
          </div>

          <Link
            href="/pit-stops"
            className="bg-cockpit-console hover:bg-cockpit-elevated border border-hairline-border rounded p-4 transition-all group block hover:border-telemetry-amber/50"
          >
            <div className="flex justify-between items-start">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-steel">
                Fastest Pit Stop Record
              </span>
              <Timer className="w-4 h-4 text-telemetry-amber group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-1.5 font-mono text-3xl font-black text-telemetry-amber tabular-nums">
              {insights.fastest_pit_stop.duration_s}s
            </div>
            <div className="text-xs text-zinc-300 mt-1 truncate">
              {insights.fastest_pit_stop.driver_name} ({insights.fastest_pit_stop.team_name})
            </div>
            <div className="font-mono text-[11px] text-muted-steel mt-1">
              R{insights.fastest_pit_stop.round} · {insights.fastest_pit_stop.race_name} →
            </div>
          </Link>

          <div className="bg-cockpit-console border border-hairline-border rounded p-4">
            <div className="flex justify-between items-start">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-steel">
                Incident Cost Index
              </span>
              <ShieldAlert className="w-4 h-4 text-f1-crimson" />
            </div>
            <div className="mt-1.5 font-mono text-3xl font-black text-pure-white tabular-nums">
              ${(insights.estimated_damage_cost / 1_000_000).toFixed(1)}M
            </div>
            <div className="text-xs text-muted-steel mt-1 font-mono">
              <span className="font-semibold text-pure-white">{insights.incidents_dnfs}</span> crash & mechanical DNFs
            </div>
            <div className="font-mono text-[10px] text-zinc-500 mt-1 uppercase">
              Chassis & Aero Replacement Model
            </div>
          </div>

          <Link
            href="/telemetry"
            className="bg-cockpit-console hover:bg-cockpit-elevated border border-hairline-border rounded p-4 transition-all group block hover:border-telemetry-cyan/50"
          >
            <div className="flex justify-between items-start">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-steel">
                Telemetry Laps Indexed
              </span>
              <Cpu className="w-4 h-4 text-telemetry-cyan group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-1.5 font-mono text-3xl font-black text-telemetry-cyan tabular-nums">
              {insights.telemetry_laps_analyzed.toLocaleString()}
            </div>
            <div className="text-xs text-zinc-300 mt-1">
              Distance-aligned telemetry traces
            </div>
            <div className="font-mono text-[11px] text-telemetry-cyan/80 mt-1 flex items-center gap-1 group-hover:underline">
              <span>Launch Telemetry Duel</span>
              <span>→</span>
            </div>
          </Link>
        </div>
      )}

      {/* QUICK NAVIGATION ACTION PILLS */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/telemetry"
          className="inline-flex items-center gap-2 rounded border border-telemetry-cyan/30 bg-cockpit-console px-3.5 py-1.5 font-mono text-xs font-semibold text-telemetry-cyan hover:bg-cockpit-elevated hover:border-telemetry-cyan transition-all shadow-[0_0_10px_rgba(0,229,255,0.1)]"
        >
          <Cpu className="h-3.5 w-3.5" />
          <span>Telemetry Duel (Overlaid Traces)</span>
        </Link>
        <Link
          href="/predictor"
          className="inline-flex items-center gap-2 rounded border border-personal-best-green/30 bg-cockpit-console px-3.5 py-1.5 font-mono text-xs font-semibold text-personal-best-green hover:bg-cockpit-elevated hover:border-personal-best-green transition-all"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Podium Probability Predictor</span>
        </Link>
        <Link
          href="/head-to-head"
          className="inline-flex items-center gap-2 rounded border border-fastest-lap-purple/30 bg-cockpit-console px-3.5 py-1.5 font-mono text-xs font-semibold text-purple-300 hover:bg-cockpit-elevated hover:border-fastest-lap-purple transition-all"
        >
          <GitCompare className="h-3.5 w-3.5" />
          <span>Teammate Head-to-Head</span>
        </Link>
        <Link
          href="/pit-stops"
          className="inline-flex items-center gap-2 rounded border border-telemetry-amber/30 bg-cockpit-console px-3.5 py-1.5 font-mono text-xs font-semibold text-telemetry-amber hover:bg-cockpit-elevated hover:border-telemetry-amber transition-all"
        >
          <Wrench className="h-3.5 w-3.5" />
          <span>Pit Stop Leaderboards</span>
        </Link>
        <Link
          href="/races"
          className="inline-flex items-center gap-2 rounded border border-hairline-border bg-cockpit-console px-3.5 py-1.5 font-mono text-xs font-semibold text-zinc-300 hover:bg-cockpit-elevated hover:text-white transition-all"
        >
          <Flag className="h-3.5 w-3.5 text-f1-crimson" />
          <span>Calendar & Circuits Radar</span>
        </Link>
      </div>

      {/* SECTION: NEXT 2 RACES SPOTLIGHT WITH TRACK LINES, DRIVER AVATARS & TEAM LOGOS */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-f1-crimson">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-f1-crimson opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-f1-crimson"></span>
            </span>
            <span>NEXT 2 GRAND PRIX SPOTLIGHT // TRACK DNA & CONTENDER RADAR</span>
          </div>
          <span className="font-mono text-xs text-muted-steel">CALENDAR ROUNDS 18 & 19</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: United States Grand Prix (COTA) */}
          <div className="rounded border border-f1-crimson/50 bg-cockpit-console p-5 shadow-[0_0_15px_rgba(225,6,0,0.1)] relative overflow-hidden">
            <div className="flex items-center justify-between font-mono text-xs mb-2">
              <span className="font-bold text-f1-crimson uppercase">ROUND 18 · UPCOMING NEXT</span>
              <span className="px-2 py-0.5 rounded bg-f1-crimson/20 text-f1-crimson border border-f1-crimson/40 text-[10px] font-bold">
                23–25 OCT 2026
              </span>
            </div>

            <h3 className="text-xl font-black text-pure-white">
              United States Grand Prix
            </h3>
            <p className="font-mono text-xs text-muted-steel flex items-center gap-1 mt-0.5">
              <MapPin className="h-3.5 w-3.5 text-f1-crimson" />
              <span>Circuit of the Americas · Austin, Texas</span>
            </p>

            {/* TRACK LINE SVG VECTOR */}
            <div className="mt-3 rounded border border-hairline-border bg-carbon-asphalt p-2">
              <CircuitTrackOutline
                country="United States"
                circuitName="Circuit of the Americas"
                strokeColor="#00E5FF"
                className="h-32"
              />
            </div>

            {/* Circuit specs */}
            <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-center text-xs">
              <div className="rounded bg-cockpit-elevated p-2">
                <span className="text-[10px] text-muted-steel block uppercase">Length</span>
                <span className="font-bold text-pure-white">5.513 km</span>
              </div>
              <div className="rounded bg-cockpit-elevated p-2">
                <span className="text-[10px] text-muted-steel block uppercase">Corners</span>
                <span className="font-bold text-pure-white">20 Turns</span>
              </div>
              <div className="rounded bg-cockpit-elevated p-2">
                <span className="text-[10px] text-muted-steel block uppercase">Elevation</span>
                <span className="font-bold text-pure-white">41m Climb (T1)</span>
              </div>
            </div>

            {/* Top Contenders & Constructor Logos */}
            <div className="mt-4 pt-3 border-t border-hairline-border">
              <div className="font-mono text-[11px] text-muted-steel uppercase mb-2 flex items-center justify-between">
                <span>Top Predicted Contenders</span>
                <span className="text-telemetry-cyan">2026 Title Fight Form</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <DriverAvatar driverCode="ANT" driverName="Kimi Antonelli" size="md" />
                  <DriverAvatar driverCode="RUS" driverName="George Russell" size="md" />
                  <DriverAvatar driverCode="HAM" driverName="Lewis Hamilton" size="md" />
                  <DriverAvatar driverCode="VER" driverName="Max Verstappen" size="md" />
                  <DriverAvatar driverCode="LEC" driverName="Charles Leclerc" size="md" />
                </div>
                <div className="flex items-center gap-2">
                  <ConstructorLogo teamName="Mercedes" size="sm" showName={false} />
                  <ConstructorLogo teamName="Ferrari" size="sm" showName={false} />
                  <ConstructorLogo teamName="Red Bull" size="sm" showName={false} />
                  <ConstructorLogo teamName="McLaren" size="sm" showName={false} />
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Link
                href="/predictor?race_id=246"
                className="flex-1 text-center py-2 rounded bg-f1-crimson hover:bg-red-500 font-mono text-xs font-bold text-pure-white transition"
              >
                Inspect US GP Predictions (ANT P1) →
              </Link>
            </div>
          </div>

          {/* Card 2: Mexico City Grand Prix (Hermanos Rodríguez) */}
          <div className="rounded border border-hairline-border bg-cockpit-console p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between font-mono text-xs mb-2">
              <span className="font-bold text-telemetry-amber uppercase">ROUND 19 · FOLLOWING EVENT</span>
              <span className="px-2 py-0.5 rounded bg-cockpit-panel text-muted-steel text-[10px] font-bold">
                30 OCT – 01 NOV 2026
              </span>
            </div>

            <h3 className="text-xl font-black text-pure-white">
              Mexico City Grand Prix
            </h3>
            <p className="font-mono text-xs text-muted-steel flex items-center gap-1 mt-0.5">
              <MapPin className="h-3.5 w-3.5 text-f1-crimson" />
              <span>Autódromo Hermanos Rodríguez · Mexico City</span>
            </p>

            {/* TRACK LINE SVG VECTOR */}
            <div className="mt-3 rounded border border-hairline-border bg-carbon-asphalt p-2">
              <CircuitTrackOutline
                country="Mexico"
                circuitName="Autódromo Hermanos Rodríguez"
                strokeColor="#FFB800"
                className="h-32"
              />
            </div>

            {/* Circuit specs */}
            <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-center text-xs">
              <div className="rounded bg-cockpit-elevated p-2">
                <span className="text-[10px] text-muted-steel block uppercase">Length</span>
                <span className="font-bold text-pure-white">4.304 km</span>
              </div>
              <div className="rounded bg-cockpit-elevated p-2">
                <span className="text-[10px] text-muted-steel block uppercase">Corners</span>
                <span className="font-bold text-pure-white">17 Turns</span>
              </div>
              <div className="rounded bg-cockpit-elevated p-2">
                <span className="text-[10px] text-muted-steel block uppercase">Altitude</span>
                <span className="font-bold text-pure-white">2,285m (Air Thin)</span>
              </div>
            </div>

            {/* Top Contenders & Constructor Logos */}
            <div className="mt-4 pt-3 border-t border-hairline-border">
              <div className="font-mono text-[11px] text-muted-steel uppercase mb-2 flex items-center justify-between">
                <span>Top Predicted Contenders</span>
                <span className="text-telemetry-amber">High Downforce Wing</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <DriverAvatar driverCode="ANT" driverName="Kimi Antonelli" size="md" />
                  <DriverAvatar driverCode="RUS" driverName="George Russell" size="md" />
                  <DriverAvatar driverCode="NOR" driverName="Lando Norris" size="md" />
                  <DriverAvatar driverCode="HAM" driverName="Lewis Hamilton" size="md" />
                  <DriverAvatar driverCode="VER" driverName="Max Verstappen" size="md" />
                </div>
                <div className="flex items-center gap-2">
                  <ConstructorLogo teamName="Mercedes" size="sm" showName={false} />
                  <ConstructorLogo teamName="Ferrari" size="sm" showName={false} />
                  <ConstructorLogo teamName="McLaren" size="sm" showName={false} />
                  <ConstructorLogo teamName="Red Bull" size="sm" showName={false} />
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Link
                href="/races"
                className="flex-1 text-center py-2 rounded bg-cockpit-elevated hover:bg-cockpit-panel border border-hairline-border font-mono text-xs font-bold text-pure-white transition"
              >
                Explore Mexico GP Radar →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: INTERACTIVE CIRCUIT WORLD MAP RADAR (Inspiration: formula1dashboard.com) */}
      <div className="mb-8">
        <CircuitWorldMap />
      </div>

      {/* SECTION 1: VISUALIZATIONS & CHARTS (NO TABS - ALL VISIBLE) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Chart 1: Cumulative Points Progression */}
        <div className="rounded border border-hairline-border bg-cockpit-console p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-personal-best-green">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Title Fight Progression</span>
              </div>
              <h2 className="text-base font-extrabold text-pure-white mt-0.5">WDC Championship Battle by Round</h2>
              <p className="text-xs text-muted-steel font-mono">Cumulative points curve for top 5 contenders across rounds</p>
            </div>
          </div>

          <div className="h-80 w-full">
            {chartsData && chartsData.points_progression && chartsData.points_progression.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartsData.points_progression} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E232D" />
                  <XAxis dataKey="round" stroke="#64748B" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                  <YAxis stroke="#64748B" tick={{ fontSize: 11, fontFamily: 'monospace' }} unit=" pts" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#11141A', borderColor: 'rgba(255,255,255,0.1)', fontSize: '12px', fontFamily: 'monospace' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px', fontFamily: 'monospace' }} />
                  {chartsData.top_driver_codes.map((code) => (
                    <Line
                      key={code}
                      type="monotone"
                      dataKey={code}
                      name={code}
                      stroke={DRIVER_COLORS[code] || '#a1a1aa'}
                      strokeWidth={2.5}
                      dot={{ r: 2.5 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-steel font-mono text-xs">
                NO ROUND PROGRESSION DATA RECORDED
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Constructor Championship Points */}
        <div className="rounded border border-hairline-border bg-cockpit-console p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-telemetry-cyan">
                <Award className="h-3.5 w-3.5" />
                <span>Constructor Standings Share</span>
              </div>
              <h2 className="text-base font-extrabold text-pure-white mt-0.5">WCC Points Breakdown</h2>
              <p className="text-xs text-muted-steel font-mono">Total points per constructor in the {selectedSeason} season</p>
            </div>
          </div>

          <div className="h-80 w-full">
            {constructorStandings.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={constructorStandings.slice(0, 8)}
                  layout="vertical"
                  margin={{ top: 5, right: 35, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E232D" horizontal={false} />
                  <XAxis type="number" stroke="#64748B" tick={{ fontSize: 11, fontFamily: 'monospace' }} unit=" pts" />
                  <YAxis
                    dataKey="team_name"
                    type="category"
                    stroke="#F8FAFC"
                    width={100}
                    interval={0}
                    tick={{ fontSize: 11, fontWeight: 600 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#11141A', borderColor: 'rgba(255,255,255,0.1)', fontSize: '12px', fontFamily: 'monospace' }}
                    formatter={(val: any) => [`${val} points`, 'Total Score']}
                  />
                  <Bar dataKey="points" radius={[0, 2, 2, 0]} barSize={14}>
                    {constructorStandings.slice(0, 8).map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={CONSTRUCTOR_COLORS[entry.team_name] || '#3b82f6'}
                      />
                    ))}
                    <LabelList dataKey="points" position="right" fill="#F8FAFC" fontSize={11} offset={6} fontFamily="monospace" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-steel font-mono text-xs">
                NO CONSTRUCTOR STANDINGS AVAILABLE
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION: DESTRUCTORS CHAMPIONSHIP & PIT STOP DHL VELOCITY (formula1dashboard feature) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Destructors Championship Card */}
        <div className="rounded border border-hairline-border bg-cockpit-console p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-f1-crimson">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Destructors Championship · Damage Index</span>
              </div>
              <h2 className="text-base font-extrabold text-pure-white mt-0.5">
                Estimated Crash & Damage Cost by Team
              </h2>
            </div>
            <span className="font-mono text-xs text-muted-steel">USD ($M)</span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            {DESTRUCTORS_DATA.map((item, idx) => (
              <div
                key={item.team}
                className="flex items-center justify-between rounded border border-hairline-border bg-cockpit-elevated p-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 text-muted-steel font-bold">#{idx + 1}</span>
                  <ConstructorLogo teamName={item.team} size="sm" showName={true} />
                  <span className="text-[10px] text-muted-steel hidden sm:inline">
                    · Primary: {item.primary}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-f1-crimson">${item.cost_m.toFixed(1)}M</div>
                  <div className="text-[10px] text-muted-steel">{item.incidents} incidents</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DHL Fastest Pit Stop Team Leaderboard */}
        <div className="rounded border border-hairline-border bg-cockpit-console p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-telemetry-amber">
                <Timer className="h-3.5 w-3.5" />
                <span>DHL Fastest Pit Stop Championship</span>
              </div>
              <h2 className="text-base font-extrabold text-pure-white mt-0.5">
                Average Pit Stop Duration & Sub-2s Records
              </h2>
            </div>
            <Link href="/pit-stops" className="font-mono text-xs text-telemetry-cyan hover:underline">
              Leaderboards →
            </Link>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            {[
              { team: 'McLaren', avg: '2.35s', fastest: '1.98s', rank: 1, points: 345 },
              { team: 'Ferrari', avg: '2.40s', fastest: '2.05s', rank: 2, points: 312 },
              { team: 'Red Bull Racing', avg: '2.55s', fastest: '1.95s', rank: 3, points: 298 },
              { team: 'Mercedes', avg: '2.58s', fastest: '2.10s', rank: 4, points: 254 },
              { team: 'Aston Martin', avg: '2.74s', fastest: '2.25s', rank: 5, points: 198 },
              { team: 'Williams', avg: '2.81s', fastest: '2.30s', rank: 6, points: 156 },
              { team: 'Alpine', avg: '2.92s', fastest: '2.35s', rank: 7, points: 122 },
            ].map((p) => (
              <div
                key={p.team}
                className="flex items-center justify-between rounded border border-hairline-border bg-cockpit-elevated p-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 text-muted-steel font-bold">#{p.rank}</span>
                  <ConstructorLogo teamName={p.team} size="sm" showName={true} />
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="text-[10px] text-muted-steel block uppercase">Avg Stop</span>
                    <span className="font-bold text-pure-white">{p.avg}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-steel block uppercase">Fastest</span>
                    <span className="font-bold text-telemetry-amber">{p.fastest}</span>
                  </div>
                  <div className="w-12">
                    <span className="text-[10px] text-muted-steel block uppercase">DHL Pts</span>
                    <span className="font-bold text-telemetry-cyan">{p.points}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 2: RACE WINNERS TIMELINE */}
      {chartsData?.winners && chartsData.winners.length > 0 && (
        <div className="mb-8 rounded border border-hairline-border bg-cockpit-console p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-telemetry-amber">
                <Trophy className="h-3.5 w-3.5" />
                <span>Season Victor Registry</span>
              </div>
              <h2 className="text-base font-extrabold text-pure-white mt-0.5">
                Grand Prix Winners ({chartsData.winners.length} Completed Rounds)
              </h2>
            </div>
            <span className="font-mono text-xs text-muted-steel">P1 CLASSIFICATION ARCHIVE</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {chartsData.winners.map((w) => (
              <div
                key={w.round}
                className="rounded border border-hairline-border bg-cockpit-elevated p-3 hover:border-telemetry-cyan/50 transition-colors"
              >
                <div className="font-mono text-[11px] text-muted-steel">R{w.round} GRAND PRIX</div>
                <div className="text-xs font-semibold text-zinc-200 truncate mt-0.5" title={w.race_name}>
                  {w.race_name}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <DriverAvatar driverCode={w.driver_code} driverName={w.driver_name} size="sm" />
                  <div className="truncate">
                    <div className="text-xs font-bold text-pure-white truncate">{w.driver_name}</div>
                    <div className="text-[10px] text-muted-steel truncate font-mono">{w.team_name}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: DRIVER & CONSTRUCTOR CHAMPIONSHIP TABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Driver Championship Table */}
        <div className="lg:col-span-2 rounded border border-hairline-border bg-cockpit-console overflow-hidden shadow-sm">
          <div className="p-4 border-b border-hairline-border flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-pure-white text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-telemetry-amber" />
                Driver World Championship Standings
              </h3>
              <p className="font-mono text-xs text-muted-steel mt-0.5">Top classified drivers in the {selectedSeason} season</p>
            </div>
            <Link href="/head-to-head" className="font-mono text-xs text-telemetry-cyan hover:underline">
              Teammate Duel →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-carbon-asphalt text-[11px] font-mono text-muted-steel uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Pos</th>
                  <th className="py-2.5 px-4">Driver</th>
                  <th className="py-2.5 px-4">Team</th>
                  <th className="py-2.5 px-4 text-center">Wins</th>
                  <th className="py-2.5 px-4 text-center">Podiums</th>
                  <th className="py-2.5 px-4 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-border text-zinc-300">
                {driverStandings.slice(0, 12).map((d) => (
                  <tr key={d.driver_id} className="hover:bg-cockpit-elevated/60 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold">
                      <span
                        className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs ${
                          d.rank === 1
                            ? 'bg-telemetry-amber/20 text-telemetry-amber font-extrabold border border-telemetry-amber/30'
                            : d.rank === 2
                            ? 'bg-zinc-300/20 text-zinc-200 font-bold'
                            : d.rank === 3
                            ? 'bg-amber-700/20 text-amber-500 font-bold'
                            : 'text-muted-steel'
                        }`}
                      >
                        {d.rank}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-pure-white">
                      <div className="flex items-center gap-2">
                        <DriverAvatar driverCode={d.driver_code} driverName={d.driver_name} size="sm" />
                        <div>
                          <button
                            onClick={() => openDriver(d.driver_code)}
                            className="text-left hover:text-telemetry-cyan transition-colors"
                          >
                            {d.driver_name}
                          </button>
                          <span className="text-xs font-mono text-muted-steel ml-1.5">[{d.driver_code}]</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-muted-steel">
                      <ConstructorLogo teamName={d.team_name} size="sm" showName={true} />
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono">
                      {d.wins > 0 ? (
                        <span className="bg-telemetry-amber/15 text-telemetry-amber px-1.5 py-0.5 rounded font-bold text-xs">
                          {d.wins}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono">{d.podiums || '-'}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-pure-white text-base tabular-nums">
                      {d.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Constructor Championship Table */}
        <div className="rounded border border-hairline-border bg-cockpit-console overflow-hidden shadow-sm">
          <div className="p-4 border-b border-hairline-border flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-pure-white text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-f1-crimson" />
                Constructors Championship
              </h3>
              <p className="font-mono text-xs text-muted-steel mt-0.5">{selectedSeason} Team Standings</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-carbon-asphalt text-[11px] font-mono text-muted-steel uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Pos</th>
                  <th className="py-2.5 px-4">Constructor</th>
                  <th className="py-2.5 px-4 text-right">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-border text-zinc-300">
                {constructorStandings.map((c) => (
                  <tr key={c.constructor_id} className="hover:bg-cockpit-elevated/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-xs text-muted-steel">{c.rank}</td>
                    <td className="py-3 px-4">
                      <ConstructorLogo teamName={c.team_name} size="md" showName={true} />
                      <div className="font-mono text-[11px] text-muted-steel mt-0.5">
                        {c.wins} wins · {c.podiums} podiums
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-pure-white text-base tabular-nums">
                      {c.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
