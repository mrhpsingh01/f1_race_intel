'use client';

import { useEffect, useState } from 'react';
import { api, HeadToHeadResponse, DriverStanding } from '@/lib/api';
import { Users, Award, ShieldAlert, Flag, Gauge, Timer, ChevronRight } from 'lucide-react';
import { DriverAvatar, ConstructorLogo } from '@/components/common/ConstructorLogo';

const SEASONS = [2026, 2025, 2024, 2023, 2022, 2021];

export default function HeadToHeadPage() {
  const [season, setSeason] = useState<number>(2026);
  const [driversList, setDriversList] = useState<DriverStanding[]>([]);
  const [driverACode, setDriverACode] = useState<string>('ANT');
  const [driverBCode, setDriverBCode] = useState<string>('RUS');
  const [h2h, setH2H] = useState<HeadToHeadResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load driver standings to populate dropdown choices
  useEffect(() => {
    async function loadDrivers() {
      try {
        const res = await api.getDriverStandings(season);
        setDriversList(res.standings);
        if (res.standings.length >= 2) {
          // If current selections are not in this season, pick top 2
          const codes = res.standings.map(d => d.driver_code);
          if (!codes.includes(driverACode)) setDriverACode(codes[0]);
          if (!codes.includes(driverBCode)) setDriverBCode(codes[1] || codes[0]);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadDrivers();
  }, [season]);

  // Fetch comparison
  useEffect(() => {
    async function fetchComparison() {
      if (!driverACode || !driverBCode) return;
      setLoading(true);
      setError(null);
      try {
        const data = await api.getHeadToHead(driverACode, driverBCode, season);
        setH2H(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load head-to-head data');
      } finally {
        setLoading(false);
      }
    }
    fetchComparison();
  }, [season, driverACode, driverBCode]);

  const da = h2h?.driver_a;
  const db = h2h?.driver_b;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-red-500 text-sm font-semibold mb-2">
          <Users className="w-4 h-4" />
          <span>F1 ANALYTICS · HEAD TO HEAD</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Driver Head-to-Head Duel
        </h1>
        <p className="text-zinc-400 mt-1">
          Compare qualifying gaps, race duels, podium counts, and scoring consistency between any two drivers.
        </p>
      </div>

      {/* Selectors Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-8 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Season</label>
            <select
              value={season}
              onChange={(e) => setSeason(Number(e.target.value))}
              className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
            >
              {SEASONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Driver 1</label>
            <select
              value={driverACode}
              onChange={(e) => setDriverACode(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
            >
              {driversList.map((d) => (
                <option key={d.driver_code} value={d.driver_code}>
                  {d.driver_name} ({d.driver_code}) - {d.team_name}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-5 text-zinc-500 font-bold">VS</div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Driver 2</label>
            <select
              value={driverBCode}
              onChange={(e) => setDriverBCode(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
            >
              {driversList.map((d) => (
                <option key={d.driver_code} value={d.driver_code}>
                  {d.driver_name} ({d.driver_code}) - {d.team_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Teammate Duel Shortcuts */}
        <div className="flex gap-2">
          <button
            onClick={() => { setDriverACode('VER'); setDriverBCode('PER'); }}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs border border-zinc-700"
          >
            Red Bull Duel
          </button>
          <button
            onClick={() => { setDriverACode('NOR'); setDriverBCode('PIA'); }}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs border border-zinc-700"
          >
            McLaren Duel
          </button>
          <button
            onClick={() => { setDriverACode('LEC'); setDriverBCode('SAI'); }}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs border border-zinc-700"
          >
            Ferrari Duel
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-20 text-zinc-400">
          Loading comparison data...
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6">
          {error}
        </div>
      )}

      {!loading && h2h && da && db && (
        <div>
          {/* Driver Cards Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Driver A Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <DriverAvatar driverCode={da.code} driverName={da.full_name} size="xl" />
                  <div>
                    <h2 className="text-2xl font-bold text-white">{da.full_name}</h2>
                    <div className="mt-1 flex items-center gap-2">
                      <ConstructorLogo teamName={da.team} size="sm" showName={true} />
                      <span className="text-xs text-zinc-400">· {da.nationality}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-white">{da.points}</div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider">PTS</div>
                </div>
              </div>
            </div>

            {/* Driver B Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <DriverAvatar driverCode={db.code} driverName={db.full_name} size="xl" />
                  <div>
                    <h2 className="text-2xl font-bold text-white">{db.full_name}</h2>
                    <div className="mt-1 flex items-center gap-2">
                      <ConstructorLogo teamName={db.team} size="sm" showName={true} />
                      <span className="text-xs text-zinc-400">· {db.nationality}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-white">{db.points}</div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider">PTS</div>
                </div>
              </div>
            </div>
          </div>

          {/* Direct Duels Scoreboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Race Head-to-Head */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <Flag className="w-4 h-4 text-amber-400" />
                  <span>Race Finish Duel</span>
                </div>
                <span className="text-xs text-zinc-400">Races finished ahead</span>
              </div>
              <div className="flex items-center justify-between text-2xl font-extrabold mb-2">
                <span className="text-red-400">{h2h.race_duel.driver_a_ahead}</span>
                <span className="text-xs font-normal text-zinc-500 uppercase">Head-to-head</span>
                <span className="text-blue-400">{h2h.race_duel.driver_b_ahead}</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden flex">
                <div
                  className="bg-red-500 h-full transition-all"
                  style={{
                    width: `${
                      (h2h.race_duel.driver_a_ahead + h2h.race_duel.driver_b_ahead) > 0
                        ? (h2h.race_duel.driver_a_ahead / (h2h.race_duel.driver_a_ahead + h2h.race_duel.driver_b_ahead)) * 100
                        : 50
                    }%`,
                  }}
                />
                <div
                  className="bg-blue-500 h-full transition-all"
                  style={{
                    width: `${
                      (h2h.race_duel.driver_a_ahead + h2h.race_duel.driver_b_ahead) > 0
                        ? (h2h.race_duel.driver_b_ahead / (h2h.race_duel.driver_a_ahead + h2h.race_duel.driver_b_ahead)) * 100
                        : 50
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Qualifying Head-to-Head */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <Timer className="w-4 h-4 text-amber-400" />
                  <span>Qualifying Duel</span>
                </div>
                <span className="text-xs text-zinc-400">Out-qualified teammate</span>
              </div>
              <div className="flex items-center justify-between text-2xl font-extrabold mb-2">
                <span className="text-red-400">{h2h.quali_duel.driver_a_ahead}</span>
                <span className="text-xs font-normal text-zinc-500 uppercase">Head-to-head</span>
                <span className="text-blue-400">{h2h.quali_duel.driver_b_ahead}</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden flex">
                <div
                  className="bg-red-500 h-full transition-all"
                  style={{
                    width: `${
                      (h2h.quali_duel.driver_a_ahead + h2h.quali_duel.driver_b_ahead) > 0
                        ? (h2h.quali_duel.driver_a_ahead / (h2h.quali_duel.driver_a_ahead + h2h.quali_duel.driver_b_ahead)) * 100
                        : 50
                    }%`,
                  }}
                />
                <div
                  className="bg-blue-500 h-full transition-all"
                  style={{
                    width: `${
                      (h2h.quali_duel.driver_a_ahead + h2h.quali_duel.driver_b_ahead) > 0
                        ? (h2h.quali_duel.driver_b_ahead / (h2h.quali_duel.driver_a_ahead + h2h.quali_duel.driver_b_ahead)) * 100
                        : 50
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Granular Stats Comparison Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-8">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Key Metrics Comparison</h3>
              <span className="text-xs text-zinc-400">Season {season} Official Classification</span>
            </div>

            <div className="divide-y divide-zinc-800/60">
              {[
                { label: 'Championship Points', valA: da.points, valB: db.points, higherBetter: true },
                { label: 'Race Wins', valA: da.wins, valB: db.wins, higherBetter: true },
                { label: 'Podiums (Top 3)', valA: da.podiums, valB: db.podiums, higherBetter: true },
                { label: 'Pole Positions', valA: da.poles, valB: db.poles, higherBetter: true },
                { label: 'Average Finish Position', valA: da.avg_finish ? `P${da.avg_finish}` : '--', valB: db.avg_finish ? `P${db.avg_finish}` : '--', rawA: da.avg_finish, rawB: db.avg_finish, higherBetter: false },
                { label: 'Average Qualifying Position', valA: da.avg_quali ? `P${da.avg_quali}` : '--', valB: db.avg_quali ? `P${db.avg_quali}` : '--', rawA: da.avg_quali, rawB: db.avg_quali, higherBetter: false },
                { label: 'DNFs / Retirements', valA: da.dnfs, valB: db.dnfs, higherBetter: false },
                { label: 'Races Entered', valA: da.races, valB: db.races, higherBetter: true },
              ].map((metric) => {
                const numA = (metric.rawA ?? (typeof metric.valA === 'number' ? metric.valA : 0)) || 0;
                const numB = (metric.rawB ?? (typeof metric.valB === 'number' ? metric.valB : 0)) || 0;
                
                const aWins = metric.higherBetter ? numA > numB : (numA > 0 && numB > 0 && numA < numB);
                const bWins = metric.higherBetter ? numB > numA : (numA > 0 && numB > 0 && numB < numA);

                return (
                  <div key={metric.label} className="grid grid-cols-7 py-3 px-4 items-center hover:bg-zinc-800/20 text-sm">
                    <div className={`col-span-2 text-right font-semibold ${aWins ? 'text-red-400 font-bold' : 'text-zinc-300'}`}>
                      {metric.valA}
                    </div>
                    <div className="col-span-3 text-center text-xs uppercase font-medium tracking-wider text-zinc-400">
                      {metric.label}
                    </div>
                    <div className={`col-span-2 text-left font-semibold ${bWins ? 'text-blue-400 font-bold' : 'text-zinc-300'}`}>
                      {metric.valB}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
