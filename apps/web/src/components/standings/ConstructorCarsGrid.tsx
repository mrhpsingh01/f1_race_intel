'use client';

import React from 'react';
import { ConstructorStanding } from '@/lib/api';
import { DriverAvatar, ConstructorLogo } from '@/components/common/ConstructorLogo';
import { Trophy, Shield, Cpu, Gauge } from 'lucide-react';

interface ConstructorCarsGridProps {
  standings: ConstructorStanding[];
}

interface TeamMeta {
  fullName: string;
  chassis: string;
  engine: string;
  carImage: string;
  teamLogo: string;
  color: string;
  driverCodes: [string, string];
}

const TEAMS_2026_META: Record<string, TeamMeta> = {
  'Mercedes': {
    fullName: 'Mercedes-AMG PETRONAS F1 Team',
    chassis: 'W17',
    engine: 'Mercedes-AMG F1 M17 E',
    carImage: '/images/cars/mercedes.png',
    teamLogo: '/images/teams/2026-mercedes-normalized-logo.avif',
    color: '#27F4D2',
    driverCodes: ['RUS', 'ANT'],
  },
  'Ferrari': {
    fullName: 'Scuderia Ferrari HP',
    chassis: 'SF-26',
    engine: 'Ferrari 067/1',
    carImage: '/images/cars/ferrari.png',
    teamLogo: '/images/teams/ferrari-normalized-logo.avif',
    color: '#E8002D',
    driverCodes: ['LEC', 'HAM'],
  },
  'McLaren': {
    fullName: 'McLaren Mastercard Formula 1 Team',
    chassis: 'MCL40',
    engine: 'Mercedes-AMG F1 M17 E',
    carImage: '/images/cars/mclaren.png',
    teamLogo: '/images/teams/mclaren-normalized-logo.avif',
    color: '#FF8000',
    driverCodes: ['NOR', 'PIA'],
  },
  'Red Bull Racing': {
    fullName: 'Oracle Red Bull Racing',
    chassis: 'RB22',
    engine: 'Red Bull Ford Powertrains',
    carImage: '/images/cars/red_bull.png',
    teamLogo: '/images/teams/rbr-normalized-logo.avif',
    color: '#3671C6',
    driverCodes: ['VER', 'HAD'],
  },
  'Red Bull': {
    fullName: 'Oracle Red Bull Racing',
    chassis: 'RB22',
    engine: 'Red Bull Ford Powertrains',
    carImage: '/images/cars/red_bull.png',
    teamLogo: '/images/teams/rbr-normalized-logo.avif',
    color: '#3671C6',
    driverCodes: ['VER', 'HAD'],
  },
  'RB': {
    fullName: 'Visa Cash App RB Formula One Team',
    chassis: 'VCARB 03',
    engine: 'Red Bull Ford Powertrains',
    carImage: '/images/cars/rb.png',
    teamLogo: '/images/teams/rb-normalized-logo.avif',
    color: '#6692FF',
    driverCodes: ['LAW', 'TSU'],
  },
  'Alpine': {
    fullName: 'BWT Alpine F1 Team',
    chassis: 'A526',
    engine: 'Mercedes-AMG F1 M17 E',
    carImage: '/images/cars/alpine.png',
    teamLogo: '/images/teams/alpine-normalized-logo.avif',
    color: '#0093CC',
    driverCodes: ['GAS', 'COL'],
  },
  'Haas': {
    fullName: 'MoneyGram Haas F1 Team',
    chassis: 'VF-26',
    engine: 'Ferrari 067/1',
    carImage: '/images/cars/haas.png',
    teamLogo: '/images/teams/haas-normalized-logo.avif',
    color: '#B6BABD',
    driverCodes: ['BEA', 'OCO'],
  },
  'Audi': {
    fullName: 'Audi Revolut F1 Team',
    chassis: 'R26',
    engine: 'Audi F1 Factory Powertrain',
    carImage: '/images/cars/audi.png',
    teamLogo: '/images/teams/audi-normalized-logo.avif',
    color: '#F50537',
    driverCodes: ['HUL', 'BOR'],
  },
  'Sauber': {
    fullName: 'Audi Revolut F1 Team',
    chassis: 'R26',
    engine: 'Audi F1 Factory Powertrain',
    carImage: '/images/cars/audi.png',
    teamLogo: '/images/teams/audi-normalized-logo.avif',
    color: '#F50537',
    driverCodes: ['HUL', 'BOR'],
  },
  'Williams': {
    fullName: 'Williams Racing',
    chassis: 'FW48',
    engine: 'Mercedes-AMG F1 M17 E',
    carImage: '/images/cars/williams.png',
    teamLogo: '/images/teams/2026-williams-normalized-logo.avif',
    color: '#00A0DE',
    driverCodes: ['ALB', 'SAI'],
  },
  'Aston Martin': {
    fullName: 'Aston Martin Aramco F1 Team',
    chassis: 'AMR26',
    engine: 'Honda HRC Factory',
    carImage: '/images/cars/aston_martin.png',
    teamLogo: '/images/teams/aston-martin-normalized-logo.avif',
    color: '#229971',
    driverCodes: ['ALO', 'STR'],
  },
  'Cadillac': {
    fullName: 'Cadillac Formula 1 Team',
    chassis: 'MAC-26',
    engine: 'Ferrari 067/1 (Customer)',
    carImage: '/images/cars/cadillac.png',
    teamLogo: '/images/teams/cadillac-normalized-logo.avif',
    color: '#C0A060',
    driverCodes: ['BOT', 'PER'],
  },
};

export function ConstructorCarsGrid({ standings }: ConstructorCarsGridProps) {
  // Map standings with 2026 meta
  const teams = standings.map((s) => {
    // Find matching key in TEAMS_2026_META
    const matchKey = Object.keys(TEAMS_2026_META).find((k) =>
      s.team_name.toLowerCase().includes(k.toLowerCase())
    );
    const meta = matchKey
      ? TEAMS_2026_META[matchKey]
      : {
          fullName: s.team_name,
          chassis: '2026 Spec',
          engine: '1.6L V6 Turbo Hybrid',
          carImage: '/images/cars/red_bull.png',
          teamLogo: '/images/teams/red_bull.svg',
          color: '#3b82f6',
          driverCodes: ['VER', 'PER'] as [string, string],
        };

    return {
      ...s,
      meta,
    };
  });

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col justify-between gap-2 border-b border-zinc-800 pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-500">
            <Cpu className="h-4 w-4" />
            <span>2026 Technical Regulations · Team Garages</span>
          </div>
          <h2 className="text-xl font-black text-white">2026 Constructor Cars & Liveries</h2>
          <p className="text-xs text-zinc-400">
            Next-generation 2026 active aerodynamics, sustainable power units, and driver pairings
          </p>
        </div>

        <div className="text-xs font-bold text-zinc-400">
          Showing <span className="text-white font-mono">{teams.length}</span> Official Constructors
        </div>
      </div>

      {/* 3-Column Team Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => {
          const { meta } = team;

          return (
            <div
              key={team.constructor_id}
              className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-5 shadow-xl transition-all duration-300 hover:border-zinc-700 hover:shadow-2xl hover:shadow-red-950/20"
            >
              {/* Background Team Color Glow */}
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-20"
                style={{ backgroundColor: meta.color }}
              />

              {/* Top Row: Rank, Team Name, Chassis */}
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black ${
                        team.rank === 1
                          ? 'bg-amber-400 text-black'
                          : team.rank === 2
                          ? 'bg-zinc-300 text-black'
                          : team.rank === 3
                          ? 'bg-amber-600 text-white'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {team.rank}
                    </span>
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Chassis: <strong className="text-white">{meta.chassis}</strong>
                    </span>
                  </div>

                  <h3 className="mt-1.5 text-base font-black text-white group-hover:text-red-400 transition-colors">
                    {meta.fullName}
                  </h3>

                  <div className="text-[11px] text-zinc-400 mt-0.5">{meta.engine}</div>
                </div>

                {/* Team Logo Badge */}
                <div className="flex-shrink-0">
                  <ConstructorLogo teamName={team.team_name} size="md" showName={false} />
                </div>
              </div>

              {/* Middle Section: Side-view 2026 Car Livery rendering */}
              <div className="relative z-10 mt-3 flex items-center justify-center py-2">
                <div className="relative w-full max-w-[340px] transition-transform duration-300 group-hover:scale-105">
                  <img
                    src={meta.carImage}
                    alt={`${team.team_name} 2026 car`}
                    className="w-full object-contain filter drop-shadow-2xl"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Driver Badges Row */}
              <div className="relative z-10 mt-4 flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-2.5 backdrop-blur">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Driver Lineup:
                </span>
                <div className="flex items-center gap-3">
                  {meta.driverCodes.map((code) => (
                    <div key={code} className="flex items-center gap-1.5">
                      <DriverAvatar driverCode={code} size="sm" showNumber={true} />
                      <span className="font-mono text-xs font-bold text-white">{code}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer: Points & Wins */}
              <div className="relative z-10 mt-4 flex items-center justify-between border-t border-zinc-800/60 pt-3 text-xs">
                <div>
                  <span className="text-zinc-500 font-medium">Championship:</span>{' '}
                  <span className="font-mono font-black text-white">{team.points} PTS</span>
                </div>
                <div className="text-zinc-400">
                  <span className="font-bold text-white">{team.wins}</span> wins ·{' '}
                  <span className="font-bold text-white">{team.podiums}</span> podiums
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
