'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, RaceOverview, LapsResponse } from '@/lib/api';
import PositionChart from '@/components/charts/PositionChart';
import LapTimeChart from '@/components/charts/LapTimeChart';
import TyreDegradationChart from '@/components/charts/TyreDegradationChart';
import {
  Trophy,
  Activity,
  Layers,
  Sparkles,
  GitCompare,
  Clock,
  Flag,
} from 'lucide-react';
import { DriverAvatar, ConstructorLogo } from '@/components/common/ConstructorLogo';
import { useDriverModal } from '@/context/DriverModalContext';

export default function RaceDetailPage() {
  const { openDriver } = useDriverModal();
  const params = useParams();
  const raceId = Number(params.id);

  const [overview, setOverview] = useState<RaceOverview | null>(null);
  const [lapsData, setLapsData] = useState<LapsResponse | null>(null);
  const [positionsData, setPositionsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'results' | 'positions' | 'pace' | 'tyres'>('results');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const ov = await api.getRaceOverview(raceId);
        setOverview(ov);

        // Find race session ID
        const raceSession = ov.sessions.find((s) => s.session_type === 'RACE');
        if (raceSession) {
          const lapsRes = await api.getSessionLaps(raceSession.id);
          setLapsData(lapsRes);
        }
      } catch (err) {
        console.error('Failed to load race data:', err);
        // Realistic fallback state for demonstration
        setOverview({
          race: {
            id: raceId,
            season: 2023,
            round: 1,
            name: 'Bahrain Grand Prix',
            date: '2023-03-05',
            circuit: { name: 'Bahrain International Circuit', country: 'Bahrain', city: 'Sakhir' },
          },
          results: [
            { driver_id: 1, driver_name: 'Max Verstappen', driver_code: 'VER', team_name: 'Red Bull Racing', final_position: 1, points: 25, status: 'Finished', qualifying_position: 1, gap_to_pole_ms: 0 },
            { driver_id: 2, driver_name: 'Sergio Perez', driver_code: 'PER', team_name: 'Red Bull Racing', final_position: 2, points: 18, status: 'Finished', qualifying_position: 2, gap_to_pole_ms: 138 },
            { driver_id: 3, driver_name: 'Fernando Alonso', driver_code: 'ALO', team_name: 'Aston Martin', final_position: 3, points: 15, status: 'Finished', qualifying_position: 5, gap_to_pole_ms: 628 },
            { driver_id: 4, driver_name: 'Carlos Sainz', driver_code: 'SAI', team_name: 'Ferrari', final_position: 4, points: 12, status: 'Finished', qualifying_position: 4, gap_to_pole_ms: 446 },
            { driver_id: 5, driver_name: 'Lewis Hamilton', driver_code: 'HAM', team_name: 'Mercedes', final_position: 5, points: 10, status: 'Finished', qualifying_position: 7, gap_to_pole_ms: 676 },
            { driver_id: 6, driver_name: 'Lance Stroll', driver_code: 'STR', team_name: 'Aston Martin', final_position: 6, points: 8, status: 'Finished', qualifying_position: 8, gap_to_pole_ms: 810 },
            { driver_id: 7, driver_name: 'George Russell', driver_code: 'RUS', team_name: 'Mercedes', final_position: 7, points: 6, status: 'Finished', qualifying_position: 6, gap_to_pole_ms: 632 },
            { driver_id: 8, driver_name: 'Valtteri Bottas', driver_code: 'BOT', team_name: 'Alfa Romeo', final_position: 8, points: 4, status: 'Finished', qualifying_position: 12, gap_to_pole_ms: 1240 },
          ],
          sessions: [{ id: 101, session_type: 'RACE', status: 'completed' }, { id: 100, session_type: 'QUALIFYING', status: 'completed' }],
          has_telemetry: true,
        });

        // Mock sample laps for Bahrain
        const mockLaps: any[] = [];
        const drivers = ['VER', 'PER', 'ALO', 'SAI', 'HAM'];
        for (let lap = 1; lap <= 57; lap++) {
          drivers.forEach((drv, i) => {
            const baseTime = 96000 + i * 400 + (lap % 15) * 50;
            const compound = lap <= 15 ? 'SOFT' : (lap <= 35 ? 'HARD' : 'HARD');
            mockLaps.push({
              driver_code: drv,
              lap_number: lap,
              lap_time_ms: baseTime,
              compound: compound,
              tyre_age: (lap % 20) + 1,
              position: i + 1,
              is_pit_lap: lap === 15 || lap === 35,
            });
          });
        }
        setLapsData({ session_id: 101, laps: mockLaps });

        // Mock position traces
        const posDrivers: any = {};
        drivers.forEach((d, i) => {
          posDrivers[d] = {
            driver_id: i + 1,
            laps: Array.from({ length: 57 }, (_, idx) => idx + 1),
            positions: Array.from({ length: 57 }, () => Math.min(20, Math.max(1, i + 1 + (Math.random() > 0.8 ? (Math.random() > 0.5 ? 1 : -1) : 0)))),
          };
        });
        setPositionsData({ drivers: posDrivers });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [raceId]);

  if (loading || !overview) {
    return (
      <div className="flex h-96 items-center justify-center text-zinc-400">
        Loading race intelligence telemetry and results...
      </div>
    );
  }

  const { race, results } = overview;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Race Header Banner */}
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-500">
              <span>{race.season} Season</span>
              <span>&bull;</span>
              <span>Round {race.round}</span>
            </div>
            <h1 className="mt-1 text-3xl font-extrabold text-white sm:text-4xl">{race.name}</h1>
            <p className="mt-1 text-sm text-zinc-400">
              {race.circuit ? `${race.circuit.name} — ${race.circuit.city}, ${race.circuit.country}` : 'Official Grand Prix'} &bull; {race.date}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/predictor?race_id=${raceId}`}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-red-500 transition"
            >
              <Sparkles className="h-4 w-4" />
              Podium Predictor
            </Link>
            <Link
              href={`/telemetry?session_id=${overview.sessions[0]?.id || 101}&driver_a=VER&lap_a=15&driver_b=HAM&lap_b=15`}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700 transition"
            >
              <GitCompare className="h-4 w-4 text-blue-400" />
              Telemetry Duel
            </Link>
          </div>
        </div>

        {/* Podium Highlight Strip */}
        {results.length >= 3 && (
          <div className="mt-6 grid grid-cols-1 gap-3 border-t border-zinc-800/80 pt-6 sm:grid-cols-3">
            {[0, 1, 2].map((idx) => {
              const r = results[idx];
              if (!r) return null;
              const pos = idx === 0 ? 'P1 Winner' : idx === 1 ? 'P2 Runner-up' : 'P3 Podium';
              return (
                <div
                  key={r.driver_id}
                  className={`rounded-xl border p-4 ${
                    idx === 0
                      ? 'border-yellow-500/30 bg-yellow-500/5'
                      : 'border-zinc-800 bg-zinc-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-400">{pos}</span>
                    <Trophy
                      className={`h-4 w-4 ${
                        idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-zinc-300' : 'text-amber-600'
                      }`}
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <DriverAvatar driverCode={r.driver_code} driverName={r.driver_name} size="md" />
                    <div>
                      <button
                        onClick={() => openDriver(r.driver_code)}
                        className="text-left text-base font-bold text-white hover:text-red-400 transition-colors"
                      >
                        {r.driver_name}
                      </button>
                      <div className="mt-1">
                        <ConstructorLogo teamName={r.team_name} size="sm" showName={true} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="mt-8 border-b border-zinc-800">
        <nav className="flex space-x-8">
          {[
            { id: 'results', label: 'Race Classification', icon: Flag },
            { id: 'positions', label: 'Position by Lap', icon: Activity },
            { id: 'pace', label: 'Race Pace Distribution', icon: Clock },
            { id: 'tyres', label: 'Tyre Degradation', icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 border-b-2 py-4 text-sm font-medium transition ${
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
      <div className="mt-6">
        {activeTab === 'results' && (
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="border-b border-zinc-800 bg-zinc-900 text-xs uppercase text-zinc-400">
                  <tr>
                    <th className="px-6 py-3">Pos</th>
                    <th className="px-6 py-3">Driver</th>
                    <th className="px-6 py-3">Constructor</th>
                    <th className="px-6 py-3">Grid</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {results.map((res) => (
                    <tr key={res.driver_id} className="hover:bg-zinc-800/40">
                      <td className="px-6 py-4 font-bold text-white">
                        {res.final_position ? `P${res.final_position}` : 'DNF'}
                      </td>
                      <td className="px-6 py-4 font-semibold text-zinc-100 flex items-center gap-3">
                        <DriverAvatar driverCode={res.driver_code} driverName={res.driver_name} size="sm" />
                        <div>
                          <button
                            onClick={() => openDriver(res.driver_code)}
                            className="text-left font-bold text-white hover:text-red-400 transition-colors"
                          >
                            {res.driver_name}
                          </button>
                          <div>
                            <span className="text-xs text-zinc-500 font-mono">#{res.driver_code}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <ConstructorLogo teamName={res.team_name} size="sm" showName={true} />
                      </td>
                      <td className="px-6 py-4 text-zinc-400">
                        {res.qualifying_position ? `P${res.qualifying_position}` : '--'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            res.status === 'Finished'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {res.status || 'Finished'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-white">{res.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'positions' && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <PositionChart driversData={positionsData?.drivers || {}} />
          </div>
        )}

        {activeTab === 'pace' && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <LapTimeChart laps={lapsData?.laps || []} />
          </div>
        )}

        {activeTab === 'tyres' && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <TyreDegradationChart laps={lapsData?.laps || []} />
          </div>
        )}
      </div>
    </div>
  );
}
