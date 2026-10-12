'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Race } from '@/lib/api';
import { Calendar, MapPin, ChevronRight, Trophy, Flag, Compass, Activity } from 'lucide-react';
import CircuitTrackOutline from '@/components/circuits/CircuitTrackOutline';
import CircuitWorldMap from '@/components/circuits/CircuitWorldMap';

export default function RacesPage() {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<number>(2026);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('map');

  useEffect(() => {
    async function loadRaces() {
      setLoading(true);
      try {
        const res = await api.getRaces(selectedSeason);
        setRaces(res.races || []);
      } catch (err) {
        console.error('Failed to load races:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRaces();
  }, [selectedSeason]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 font-sans">
      {/* COCKPIT HEADER BAR */}
      <div className="mb-6 rounded border border-hairline-border bg-cockpit-console/95 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-telemetry-cyan">
              <Flag className="h-3.5 w-3.5 text-f1-crimson" />
              <span>PITWALL.OS // GRAND PRIX SCHEDULE & TRACK RADAR</span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-pure-white md:text-3xl">
              {selectedSeason} Formula 1 Calendar & Circuits
            </h1>
            <p className="mt-0.5 text-xs text-muted-steel">
              Official classifications, circuit layouts, and geographical coordinates across all championship rounds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded border border-hairline-border bg-cockpit-elevated p-0.5 font-mono text-xs">
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  viewMode === 'map'
                    ? 'bg-telemetry-cyan text-carbon-asphalt shadow-[0_0_8px_rgba(0,229,255,0.4)]'
                    : 'text-muted-steel hover:text-white'
                }`}
              >
                RADAR MAP
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-telemetry-cyan text-carbon-asphalt shadow-[0_0_8px_rgba(0,229,255,0.4)]'
                    : 'text-muted-steel hover:text-white'
                }`}
              >
                GRID LIST
              </button>
            </div>

            {/* Season Selector */}
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-muted-steel font-bold uppercase">SEASON:</span>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(Number(e.target.value))}
                className="rounded border border-hairline-border bg-cockpit-elevated px-3 py-1.5 font-mono text-xs font-bold text-pure-white focus:border-telemetry-cyan focus:outline-none"
              >
                {[2026, 2025, 2024, 2023, 2022, 2021].map((s) => (
                  <option key={s} value={s}>{s} {s === 2026 ? '(Current)' : ''}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* INTERACTIVE CIRCUIT WORLD MAP RADAR */}
      {viewMode === 'map' && (
        <div className="mb-8">
          <CircuitWorldMap />
        </div>
      )}

      {/* RACES GRID WITH TRACK OUTLINE VECTORS */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-steel">
          CHAMPIONSHIP ROUNDS ({races.length} GRAND PRIX)
        </h2>
        <span className="font-mono text-xs text-muted-steel">CLICK CARD FOR TELEMETRY & STRATEGY</span>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-muted-steel font-mono text-xs">
          LOADING CALENDAR & CIRCUITS...
        </div>
      ) : races.length === 0 ? (
        <div className="rounded border border-hairline-border bg-cockpit-console p-8 text-center text-muted-steel font-mono text-xs">
          NO RACES FOUND FOR SEASON {selectedSeason}.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {races.map((race) => {
            const isCompleted = race.status === 'completed';
            const isNext = race.round === 18 && selectedSeason === 2026;

            return (
              <Link
                key={race.id}
                href={isCompleted ? `/races/${race.id}` : `/predictor?race_id=${race.id}`}
                className={`group relative flex flex-col justify-between rounded border bg-cockpit-console p-4 transition-all hover:bg-cockpit-elevated ${
                  isNext
                    ? 'border-f1-crimson shadow-[0_0_12px_rgba(225,6,0,0.15)]'
                    : 'border-hairline-border hover:border-telemetry-cyan/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className={`font-bold uppercase ${isNext ? 'text-f1-crimson' : 'text-telemetry-cyan'}`}>
                      ROUND {race.round}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isCompleted
                          ? 'bg-personal-best-green/10 text-personal-best-green border border-personal-best-green/30'
                          : isNext
                          ? 'bg-f1-crimson/20 text-f1-crimson border border-f1-crimson/40 animate-pulse'
                          : 'bg-cockpit-panel text-muted-steel'
                      }`}
                    >
                      {isCompleted ? 'COMPLETED' : isNext ? 'NEXT RACE' : 'UPCOMING'}
                    </span>
                  </div>

                  <h3 className="mt-1.5 text-base font-extrabold text-pure-white group-hover:text-telemetry-cyan transition-colors">
                    {race.name}
                  </h3>

                  {race.circuit && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-steel font-mono">
                      <MapPin className="h-3 w-3 text-f1-crimson flex-shrink-0" />
                      <span className="truncate">{race.circuit.name} ({race.circuit.city}, {race.circuit.country})</span>
                    </div>
                  )}

                  {/* TRACK LAYOUT VECTOR */}
                  <div className="mt-3 rounded border border-hairline-border bg-carbon-asphalt p-2">
                    <CircuitTrackOutline
                      country={race.circuit?.country}
                      circuitName={race.circuit?.name || race.name}
                      strokeColor={isNext ? '#00E5FF' : isCompleted ? '#27F4D2' : '#64748B'}
                      className="h-24"
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-hairline-border flex items-center justify-between font-mono text-xs">
                  <div className="flex items-center gap-1.5 text-muted-steel">
                    <Calendar className="h-3.5 w-3.5 text-telemetry-amber" />
                    <span>{race.date || 'TBD'}</span>
                  </div>
                  <span className="text-telemetry-cyan flex items-center gap-0.5 font-bold group-hover:translate-x-1 transition-transform">
                    <span>{isCompleted ? 'View Pace' : 'Predictor'}</span>
                    <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
