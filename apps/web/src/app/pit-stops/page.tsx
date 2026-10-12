'use client';

import { useEffect, useState } from 'react';
import { api, PitStopsResponse } from '@/lib/api';
import { Timer, Wrench, Trophy, Gauge, Flag } from 'lucide-react';
import { DriverAvatar, ConstructorLogo } from '@/components/common/ConstructorLogo';

const SEASONS = [2026, 2025, 2024, 2023, 2022, 2021];

export default function PitStopsPage() {
  const [season, setSeason] = useState<number>(2026);
  const [data, setData] = useState<PitStopsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getPitStops(season);
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not fetch pit stop analytics');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [season]);

  const fastest = data?.fastest_stops[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-red-500 text-sm font-semibold mb-2">
          <Wrench className="w-4 h-4" />
          <span>F1 PERFORMANCE · PIT STOP ANALYSIS</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Pit Stop Times & Team Rankings
        </h1>
        <p className="text-zinc-400 mt-1">
          Fastest individual tire changes, team crew averages, and pit lane efficiency stats.
        </p>
      </div>

      {/* Season Filter Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-8 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-zinc-300">Championship Season:</label>
          <select
            value={season}
            onChange={(e) => setSeason(Number(e.target.value))}
            className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-red-500"
          >
            {SEASONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {fastest && (
          <div className="text-xs text-zinc-400">
            Season Record: <span className="font-bold text-red-400">{fastest.duration_s}s</span> ({fastest.driver_name} - {fastest.race_name})
          </div>
        )}
      </div>

      {loading && (
        <div className="flex justify-center items-center py-20 text-zinc-400">
          Loading pit stop records...
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6">
          {error}
        </div>
      )}

      {!loading && data && (
        <div className="space-y-8">
          {/* Top Fastest Stops Podium Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {data.fastest_stops.slice(0, 3).map((stop, idx) => (
              <div
                key={idx}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    idx === 0 ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30' :
                    idx === 1 ? 'bg-zinc-400/20 text-zinc-300 border border-zinc-400/30' :
                    'bg-amber-700/20 text-amber-600 border border-amber-700/30'
                  }`}>
                    #{stop.rank} FASTEST
                  </span>
                  <div className="text-2xl font-black text-white">{stop.duration_s}s</div>
                </div>

                <div className="font-bold text-white text-lg mt-2">{stop.driver_name}</div>
                <div className="text-xs text-zinc-400">{stop.team_name} · Lap {stop.lap}</div>
                <div className="text-xs text-zinc-500 mt-3 pt-3 border-t border-zinc-800/80 flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5 text-red-500" />
                  <span>{stop.race_name} (R{stop.round})</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Team Pit Crew Averages */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-white text-base">Pit Crew Rankings & Averages</h3>
                </div>
                <span className="text-xs text-zinc-500">DHL Fastest Pit Stop Style</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-800/40 text-xs text-zinc-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">Constructor</th>
                      <th className="px-4 py-3 text-right">Stops</th>
                      <th className="px-4 py-3 text-right">Avg Time</th>
                      <th className="px-4 py-3 text-right">Fastest</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {data.team_rankings.map((t) => (
                      <tr key={t.team_name} className="hover:bg-zinc-800/30">
                        <td className="px-4 py-3 font-mono font-bold text-zinc-400">#{t.rank}</td>
                        <td className="px-4 py-3">
                          <ConstructorLogo teamName={t.team_name} size="sm" showName={true} />
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-400">{t.total_stops}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-amber-400">
                          {t.avg_duration_s}s
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-green-400">
                          {t.fastest_s}s
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Fastest Stops Leaderboard */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-red-500" />
                  <h3 className="font-bold text-white text-base">Fastest Individual Stops</h3>
                </div>
                <span className="text-xs text-zinc-500">Top 15 Record Stops</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-800/40 text-xs text-zinc-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Pos</th>
                      <th className="px-4 py-3">Driver</th>
                      <th className="px-4 py-3">Grand Prix</th>
                      <th className="px-4 py-3 text-right">Lap</th>
                      <th className="px-4 py-3 text-right">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {data.fastest_stops.map((stop) => (
                      <tr key={`${stop.driver_code}-${stop.round}-${stop.lap}`} className="hover:bg-zinc-800/30">
                        <td className="px-4 py-3 font-mono text-zinc-500">#{stop.rank}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <DriverAvatar driverCode={stop.driver_code} driverName={stop.driver_name} size="sm" />
                            <div>
                              <span className="font-semibold text-white block">{stop.driver_name}</span>
                              <div className="mt-0.5">
                                <ConstructorLogo teamName={stop.team_name} size="sm" showName={true} />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-300">{stop.race_name}</td>
                        <td className="px-4 py-3 text-right text-zinc-400">L{stop.lap}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-red-400">
                          {stop.duration_s}s
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
