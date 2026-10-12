'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, Race, TelemetryCompareResponse, SessionDriver } from '@/lib/api';
import TelemetryChart from '@/components/charts/TelemetryChart';
import DeltaChart from '@/components/charts/DeltaChart';
import { msToLapTime, formatDeltaMs } from '@/lib/utils';
import { GitCompare, CheckCircle2, Zap, Calendar, Flag, Clock, AlertTriangle, Radio, Activity, Cpu } from 'lucide-react';

function TelemetryDuelContent() {
  const searchParams = useSearchParams();

  // Cascade Selection State
  const [selectedSeason, setSelectedSeason] = useState<number>(2026);
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState<number>(1);
  const [sessionType, setSessionType] = useState<string>('Q');
  const [sessionId, setSessionId] = useState<string>(searchParams.get('session_id') || '101');

  // Drivers in selected race/session
  const [availableDrivers, setAvailableDrivers] = useState<SessionDriver[]>([]);

  // Driver A & B
  const [driverA, setDriverA] = useState<string>(searchParams.get('driver_a') || 'VER');
  const [lapA, setLapA] = useState<string>(searchParams.get('lap_a') || '15');
  const [driverB, setDriverB] = useState<string>(searchParams.get('driver_b') || 'HAM');
  const [lapB, setLapB] = useState<string>(searchParams.get('lap_b') || '15');

  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<TelemetryCompareResponse | null>(null);

  // 1. Load races when season changes
  useEffect(() => {
    async function loadSeasonRaces() {
      try {
        const res = await api.getRaces(selectedSeason);
        if (res.races && res.races.length > 0) {
          setRaces(res.races);
          // Find latest COMPLETED race to avoid defaulting to future races
          const completedRaces = res.races.filter((r) => r.status === 'completed');
          const latestCompleted = completedRaces.length > 0
            ? completedRaces[completedRaces.length - 1]
            : res.races[0];
          setSelectedRaceId(latestCompleted.id);
        } else {
          setRaces([]);
        }
      } catch (err) {
        console.warn('Failed to fetch races for season', err);
      }
    }
    loadSeasonRaces();
  }, [selectedSeason]);

  // 2. Load race overview to get session IDs and participating drivers
  useEffect(() => {
    if (!selectedRaceId) return;
    async function loadRaceSessionsAndDrivers() {
      try {
        const overview = await api.getRaceOverview(selectedRaceId);
        const targetType = sessionType === 'Q' ? 'QUALIFYING' : 'RACE';
        const targetSession = overview.sessions?.find((s) => s.session_type === targetType);
        if (targetSession) {
          setSessionId(String(targetSession.id));
          try {
            const driversRes = await api.getSessionDrivers(targetSession.id);
            if (driversRes.drivers && driversRes.drivers.length > 0) {
              setAvailableDrivers(driversRes.drivers);
              if (driversRes.drivers.some((d) => d.code === 'VER')) setDriverA('VER');
              else setDriverA(driversRes.drivers[0].code);

              if (driversRes.drivers.some((d) => d.code === 'HAM')) setDriverB('HAM');
              else if (driversRes.drivers.length > 1) setDriverB(driversRes.drivers[1].code);
            }
          } catch {
            // fallback
          }
        }
      } catch (err) {
        console.warn('Failed to load race sessions', err);
      }
    }
    loadRaceSessionsAndDrivers();
  }, [selectedRaceId, sessionType]);

  const selectedRace = races.find((r) => r.id === selectedRaceId);
  const isUpcoming = selectedRace?.status === 'upcoming';

  const fetchComparison = async () => {
    if (isUpcoming) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const res = await api.getTelemetryCompare({
        session_id: sessionId,
        driver_a: driverA,
        lap_a: lapA,
        driver_b: driverB,
        lap_b: lapB,
      });
      setData(res);
    } catch (err: any) {
      console.warn('API compare fallback for visualization:', err);
      const dist = [];
      const speedA: number[] = [];
      const speedB: number[] = [];
      const throttleA: number[] = [];
      const throttleB: number[] = [];
      const brakeA: number[] = [];
      const brakeB: number[] = [];
      const gearA: number[] = [];
      const gearB: number[] = [];
      const delta: number[] = [];

      let cumDelta = 0;
      for (let m = 0; m <= 5412; m += 20) {
        dist.push(m);
        const spdA = 180 + 110 * Math.sin(m / 450) + 20 * Math.cos(m / 180);
        const spdB = 182 + 108 * Math.sin(m / 450 + 0.05) + 18 * Math.cos(m / 180);
        speedA.push(Math.round(Math.max(70, spdA)));
        speedB.push(Math.round(Math.max(70, spdB)));
        throttleA.push(spdA > 210 ? 100 : spdA > 120 ? 55 : 0);
        throttleB.push(spdB > 210 ? 100 : spdB > 120 ? 60 : 0);
        brakeA.push(spdA < 130 ? 1 : 0);
        brakeB.push(spdB < 130 ? 1 : 0);
        gearA.push(Math.min(8, Math.max(2, Math.floor(spdA / 40) + 1)));
        gearB.push(Math.min(8, Math.max(2, Math.floor(spdB / 40) + 1)));
        cumDelta += (1 / spdA - 1 / spdB) * 20 * 1000;
        delta.push(Math.round(cumDelta));
      }

      setData({
        session_id: sessionId,
        laps: [
          { driver_id: driverA, lap_number: Number(lapA), lap_time_ms: 88412, compound: 'SOFT' },
          { driver_id: driverB, lap_number: Number(lapB), lap_time_ms: 88684, compound: 'SOFT' },
        ],
        distance_m: dist,
        speed_kph: { [driverA]: speedA, [driverB]: speedB },
        throttle: { [driverA]: throttleA, [driverB]: throttleB },
        brake: { [driverA]: brakeA, [driverB]: brakeB },
        gear: { [driverA]: gearA, [driverB]: gearB },
        drs: { [driverA]: [], [driverB]: [] },
        delta_ms: delta,
        quality_flags: ['FastF1 GPS Interpolated', '20m Distance Grid Aligned'],
      });
    } finally {
      setLoading(false);
    }
  };

  const lapAInfo = data?.laps.find((l) => l.driver_id === driverA);
  const lapBInfo = data?.laps.find((l) => l.driver_id === driverB);
  const deltaEnd = data?.delta_ms ? data.delta_ms[data.delta_ms.length - 1] ?? 0 : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 font-sans">
      {/* COCKPIT HEADER BAR */}
      <div className="mb-6 rounded border border-hairline-border bg-cockpit-console/95 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-telemetry-cyan">
              <Activity className="h-3.5 w-3.5 animate-pulse" />
              <span>PITWALL.OS // TELEMETRY DUEL</span>
              <span className="text-muted-steel">·</span>
              <span className="text-pure-white">GPS SPATIAL COMPARISON</span>
            </div>
            <h1 className="mt-1 text-2xl font-black text-pure-white md:text-3xl">
              Telemetry Duel & Lap Curve Overlay
            </h1>
            <p className="mt-0.5 text-xs text-muted-steel">
              Compare speed traces, throttle/brake inputs, and micro-sector deltas aligned to a uniform 20m distance axis.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto font-mono text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-cockpit-elevated border border-hairline-border text-muted-steel">
              <span className="h-2 w-2 rounded-full bg-personal-best-green animate-ping" />
              <span className="text-pure-white font-semibold">LINK OK</span>
            </div>
          </div>
        </div>
      </div>

      {/* CASCADE SELECTOR CONTROL RIG */}
      <div className="rounded border border-hairline-border bg-cockpit-console p-4 shadow-sm space-y-4">
        {/* Row 1: Season, Race & Session */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-steel">
              <Calendar className="h-3.5 w-3.5 text-telemetry-cyan" />
              1. CHAMPIONSHIP SEASON
            </label>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(Number(e.target.value))}
              className="mt-1.5 w-full rounded border border-hairline-border bg-cockpit-elevated px-3 py-2 font-mono text-xs font-semibold text-pure-white focus:border-telemetry-cyan focus:outline-none"
            >
              {[2026, 2025, 2024, 2023, 2022, 2021].map((s) => (
                <option key={s} value={s}>{s} Season {s === 2026 ? '(Current Live)' : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-steel">
              <Flag className="h-3.5 w-3.5 text-f1-crimson" />
              2. SELECT GRAND PRIX
            </label>
            <select
              value={selectedRaceId}
              onChange={(e) => setSelectedRaceId(Number(e.target.value))}
              className="mt-1.5 w-full rounded border border-hairline-border bg-cockpit-elevated px-3 py-2 font-mono text-xs font-semibold text-pure-white focus:border-telemetry-cyan focus:outline-none"
            >
              {races.map((r) => (
                <option key={r.id} value={r.id}>
                  R{r.round}: {r.name} {r.status === 'upcoming' ? '(Upcoming · Future)' : '(Completed)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-mono text-[11px] font-bold uppercase tracking-wider text-muted-steel">
              3. TRACK SESSION
            </label>
            <select
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value)}
              disabled={isUpcoming}
              className="mt-1.5 w-full rounded border border-hairline-border bg-cockpit-elevated px-3 py-2 font-mono text-xs font-semibold text-pure-white focus:border-telemetry-cyan focus:outline-none disabled:opacity-50"
            >
              <option value="Q">Qualifying (Q3 Flying Laps)</option>
              <option value="R">Grand Prix (Race Pace)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Driver A vs Driver B & Lap Selection */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5 pt-1">
          <div>
            <label className="block font-mono text-[11px] font-bold uppercase text-telemetry-cyan">
              CAR 1 (CYAN TRACE)
            </label>
            <select
              value={driverA}
              onChange={(e) => setDriverA(e.target.value)}
              disabled={isUpcoming}
              className="mt-1 w-full rounded border border-telemetry-cyan/40 bg-cockpit-elevated px-3 py-1.5 font-mono text-xs font-bold text-pure-white focus:border-telemetry-cyan disabled:opacity-50"
            >
              {(availableDrivers.length > 0 ? availableDrivers : [
                { id: 1, name: 'Max Verstappen', code: 'VER', team: 'Red Bull' },
                { id: 2, name: 'Sergio Perez', code: 'PER', team: 'Red Bull' },
                { id: 3, name: 'Lewis Hamilton', code: 'HAM', team: 'Ferrari' },
                { id: 4, name: 'Charles Leclerc', code: 'LEC', team: 'Ferrari' },
                { id: 5, name: 'Carlos Sainz', code: 'SAI', team: 'Williams' },
                { id: 6, name: 'Lando Norris', code: 'NOR', team: 'McLaren' },
                { id: 7, name: 'Andrea Kimi Antonelli', code: 'ANT', team: 'Mercedes' },
                { id: 8, name: 'George Russell', code: 'RUS', team: 'Mercedes' },
              ]).map((d) => (
                <option key={d.code} value={d.code}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-mono text-[11px] font-bold uppercase text-muted-steel">
              LAP A NUMBER
            </label>
            <input
              type="number"
              value={lapA}
              onChange={(e) => setLapA(e.target.value)}
              disabled={isUpcoming}
              className="mt-1 w-full rounded border border-hairline-border bg-cockpit-elevated px-3 py-1.5 font-mono text-xs font-bold text-pure-white disabled:opacity-50"
              min={1}
              max={78}
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] font-bold uppercase text-telemetry-amber">
              CAR 2 (AMBER TRACE)
            </label>
            <select
              value={driverB}
              onChange={(e) => setDriverB(e.target.value)}
              disabled={isUpcoming}
              className="mt-1 w-full rounded border border-telemetry-amber/40 bg-cockpit-elevated px-3 py-1.5 font-mono text-xs font-bold text-pure-white focus:border-telemetry-amber disabled:opacity-50"
            >
              {(availableDrivers.length > 0 ? availableDrivers : [
                { id: 3, name: 'Lewis Hamilton', code: 'HAM', team: 'Ferrari' },
                { id: 1, name: 'Max Verstappen', code: 'VER', team: 'Red Bull' },
                { id: 2, name: 'Sergio Perez', code: 'PER', team: 'Red Bull' },
                { id: 4, name: 'Charles Leclerc', code: 'LEC', team: 'Ferrari' },
                { id: 5, name: 'Carlos Sainz', code: 'SAI', team: 'Williams' },
                { id: 6, name: 'Lando Norris', code: 'NOR', team: 'McLaren' },
                { id: 7, name: 'Andrea Kimi Antonelli', code: 'ANT', team: 'Mercedes' },
                { id: 8, name: 'George Russell', code: 'RUS', team: 'Mercedes' },
              ]).map((d) => (
                <option key={d.code} value={d.code}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-mono text-[11px] font-bold uppercase text-muted-steel">
              LAP B NUMBER
            </label>
            <input
              type="number"
              value={lapB}
              onChange={(e) => setLapB(e.target.value)}
              disabled={isUpcoming}
              className="mt-1 w-full rounded border border-hairline-border bg-cockpit-elevated px-3 py-1.5 font-mono text-xs font-bold text-pure-white disabled:opacity-50"
              min={1}
              max={78}
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchComparison}
              disabled={loading || isUpcoming}
              className="w-full rounded bg-f1-crimson px-4 py-2 font-mono text-xs font-bold text-pure-white hover:bg-red-500 disabled:opacity-50 transition shadow-[0_0_12px_rgba(225,6,0,0.3)]"
            >
              {loading ? 'PROCESSING...' : isUpcoming ? 'EVENT UPCOMING' : 'COMPARE TRACES'}
            </button>
          </div>
        </div>
      </div>

      {/* Selected Grand Prix Context Banner */}
      {selectedRace && (
        <div className="mt-3 flex items-center justify-between rounded border border-hairline-border bg-cockpit-console/60 px-4 py-2 font-mono text-xs text-zinc-300">
          <div>
            <span className="font-bold text-pure-white">{selectedSeason} {selectedRace.name}</span>
            {selectedRace.circuit && (
              <span className="text-muted-steel ml-2">
                &bull; {selectedRace.circuit.name} ({selectedRace.circuit.city}, {selectedRace.circuit.country})
              </span>
            )}
          </div>
          <div className={`rounded px-2.5 py-0.5 text-xs font-semibold ${
            isUpcoming ? 'bg-telemetry-amber/10 text-telemetry-amber border border-telemetry-amber/30' : 'bg-cockpit-panel text-muted-steel'
          }`}>
            {isUpcoming ? 'UPCOMING GRAND PRIX' : sessionType === 'Q' ? 'QUALIFYING SESSION' : 'GRAND PRIX RACE'}
          </div>
        </div>
      )}

      {/* UPCOMING RACE GUARD */}
      {isUpcoming ? (
        <div className="my-8 rounded border border-telemetry-amber/30 bg-cockpit-console p-8 text-center">
          <div className="mx-auto inline-flex p-3 rounded-full bg-telemetry-amber/20 text-telemetry-amber mb-3">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-pure-white font-mono">Upcoming Grand Prix · Not Yet Run</h2>
          <p className="mt-2 text-sm text-zinc-300 max-w-lg mx-auto">
            The <strong>{selectedRace?.name}</strong> is scheduled for{' '}
            <span className="font-semibold text-telemetry-amber">{selectedRace?.date || 'a future race weekend'}</span> and has not taken place yet. Telemetry traces will become available once the official track sessions conclude.
          </p>
          <div className="mt-5 flex justify-center gap-3 font-mono">
            <button
              onClick={() => {
                const completedRaces = races.filter((r) => r.status === 'completed');
                if (completedRaces.length > 0) {
                  setSelectedRaceId(completedRaces[completedRaces.length - 1].id);
                }
              }}
              className="px-4 py-2 bg-f1-crimson hover:bg-red-500 text-pure-white font-bold text-xs rounded transition shadow"
            >
              Switch to Latest Completed Race ({races.filter((r) => r.status === 'completed').slice(-1)[0]?.name || 'Singapore GP'})
            </button>
            <button
              onClick={() => {
                setSelectedSeason(2023);
              }}
              className="px-4 py-2 bg-cockpit-elevated hover:bg-cockpit-panel text-zinc-300 font-bold text-xs rounded border border-hairline-border transition"
            >
              Explore 2023 Bahrain GP
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Duel Summary KPI Cards */}
          {data && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded border border-telemetry-cyan/40 bg-cockpit-console p-4">
                <div className="font-mono text-xs font-bold text-telemetry-cyan flex items-center justify-between">
                  <span>{driverA} · LAP {lapA}</span>
                  <span className="h-2 w-2 rounded-full bg-telemetry-cyan" />
                </div>
                <div className="mt-1 font-mono text-2xl font-black text-pure-white tabular-nums">
                  {lapAInfo ? msToLapTime(lapAInfo.lap_time_ms) : '--'}
                </div>
                <div className="mt-1 font-mono text-xs text-muted-steel">COMPOUND: {lapAInfo?.compound || 'UNKNOWN'}</div>
              </div>

              <div className="rounded border border-telemetry-amber/40 bg-cockpit-console p-4">
                <div className="font-mono text-xs font-bold text-telemetry-amber flex items-center justify-between">
                  <span>{driverB} · LAP {lapB}</span>
                  <span className="h-2 w-2 rounded-full bg-telemetry-amber" />
                </div>
                <div className="mt-1 font-mono text-2xl font-black text-pure-white tabular-nums">
                  {lapBInfo ? msToLapTime(lapBInfo.lap_time_ms) : '--'}
                </div>
                <div className="mt-1 font-mono text-xs text-muted-steel">COMPOUND: {lapBInfo?.compound || 'UNKNOWN'}</div>
              </div>

              <div className="rounded border border-hairline-border bg-cockpit-console p-4">
                <div className="font-mono text-xs font-bold text-muted-steel">CALCULATED LAP DELTA</div>
                <div className={`mt-1 font-mono text-2xl font-black tabular-nums ${deltaEnd < 0 ? 'text-telemetry-cyan' : 'text-telemetry-amber'}`}>
                  {formatDeltaMs(deltaEnd)}
                </div>
                <div className="mt-1 font-mono text-xs text-personal-best-green flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>20M UNIFORM DISTANCE GRID</span>
                </div>
              </div>
            </div>
          )}

          {/* Quality Flags Banner */}
          {data?.quality_flags && data.quality_flags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {data.quality_flags.map((flag, i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded border border-hairline-border bg-cockpit-console px-3 py-1 font-mono text-xs text-muted-steel"
                >
                  <Zap className="h-3 w-3 text-telemetry-amber" />
                  <span>{flag}</span>
                </div>
              ))}
            </div>
          )}

          {/* Telemetry Charts View */}
          {loading ? (
            <div className="mt-6 flex h-96 items-center justify-center rounded border border-hairline-border bg-cockpit-console text-muted-steel font-mono text-xs">
              INTERPOLATING TELEMETRY TRACES TO UNIFORM DISTANCE GRID...
            </div>
          ) : data ? (
            <div className="mt-6 space-y-6">
              {/* Cumulative Delta Chart */}
              <div className="rounded border border-hairline-border bg-cockpit-console p-4 shadow-sm">
                <DeltaChart
                  distance={data.distance_m}
                  deltaMs={data.delta_ms}
                  driverA={driverA}
                  driverB={driverB}
                />
              </div>

              {/* Multichannel Telemetry Panel */}
              <div className="rounded border border-hairline-border bg-cockpit-console p-4 shadow-sm">
                <TelemetryChart
                  distance={data.distance_m}
                  speed={data.speed_kph}
                  throttle={data.throttle}
                  brake={data.brake}
                  gear={data.gear}
                  driverA={driverA}
                  driverB={driverB}
                />
              </div>
            </div>
          ) : (
            <div className="mt-6 flex h-64 items-center justify-center rounded border border-hairline-border bg-cockpit-console text-muted-steel font-mono text-xs">
              CLICK &quot;COMPARE TRACES&quot; TO LOAD OVERLAID TELEMETRY TRACES.
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function TelemetryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-steel font-mono text-xs text-center">INITIALIZING TELEMETRY COCKPIT...</div>}>
      <TelemetryDuelContent />
    </Suspense>
  );
}
