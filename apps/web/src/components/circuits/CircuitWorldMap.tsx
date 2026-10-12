'use client';

import React, { useState } from 'react';
import { MapPin, Flag, Calendar, Compass, ExternalLink, ChevronRight } from 'lucide-react';
import CircuitTrackOutline from './CircuitTrackOutline';

export interface CircuitLocation {
  id: number;
  round: number;
  name: string;
  circuitName: string;
  city: string;
  country: string;
  date: string;
  status: 'completed' | 'upcoming';
  lat: number;
  lng: number;
}

// 2026 Season Host Circuits Geocoordinates
export const F1_2026_CIRCUITS: CircuitLocation[] = [
  { id: 229, round: 1, name: 'Australian Grand Prix', circuitName: 'Albert Park Circuit', city: 'Melbourne', country: 'Australia', date: '06–08 Mar', status: 'completed', lat: -37.84, lng: 144.96 },
  { id: 230, round: 2, name: 'Chinese Grand Prix', circuitName: 'Shanghai International Circuit', city: 'Shanghai', country: 'China', date: '13–15 Mar', status: 'completed', lat: 31.33, lng: 121.22 },
  { id: 231, round: 3, name: 'Japanese Grand Prix', circuitName: 'Suzuka International Racing Course', city: 'Suzuka', country: 'Japan', date: '27–29 Mar', status: 'completed', lat: 34.84, lng: 136.54 },
  { id: 232, round: 4, name: 'Miami Grand Prix', circuitName: 'Miami International Autodrome', city: 'Miami', country: 'USA', date: '01–03 May', status: 'completed', lat: 25.95, lng: -80.23 },
  { id: 233, round: 5, name: 'Canadian Grand Prix', circuitName: 'Circuit Gilles Villeneuve', city: 'Montreal', country: 'Canada', date: '22–24 May', status: 'completed', lat: 45.50, lng: -73.52 },
  { id: 234, round: 6, name: 'Monaco Grand Prix', circuitName: 'Circuit de Monaco', city: 'Monte Carlo', country: 'Monaco', date: '05–07 Jun', status: 'completed', lat: 43.73, lng: 7.42 },
  { id: 235, round: 7, name: 'Spanish Grand Prix', circuitName: 'Circuit de Barcelona-Catalunya', city: 'Barcelona', country: 'Spain', date: '12–14 Jun', status: 'completed', lat: 41.57, lng: 2.26 },
  { id: 236, round: 8, name: 'Austrian Grand Prix', circuitName: 'Red Bull Ring', city: 'Spielberg', country: 'Austria', date: '26–28 Jun', status: 'completed', lat: 47.22, lng: 14.76 },
  { id: 237, round: 9, name: 'British Grand Prix', circuitName: 'Silverstone Circuit', city: 'Silverstone', country: 'Great Britain', date: '03–05 Jul', status: 'completed', lat: 52.07, lng: -1.01 },
  { id: 238, round: 10, name: 'Belgian Grand Prix', circuitName: 'Circuit de Spa-Francorchamps', city: 'Stavelot', country: 'Belgium', date: '17–19 Jul', status: 'completed', lat: 50.43, lng: 5.97 },
  { id: 239, round: 11, name: 'Hungarian Grand Prix', circuitName: 'Hungaroring', city: 'Budapest', country: 'Hungary', date: '24–26 Jul', status: 'completed', lat: 47.58, lng: 19.25 },
  { id: 240, round: 12, name: 'Dutch Grand Prix', circuitName: 'Circuit Zandvoort', city: 'Zandvoort', country: 'Netherlands', date: '21–23 Aug', status: 'completed', lat: 52.38, lng: 4.54 },
  { id: 241, round: 13, name: 'Italian Grand Prix', circuitName: 'Autodromo Nazionale Monza', city: 'Monza', country: 'Italy', date: '04–06 Sep', status: 'completed', lat: 45.61, lng: 9.28 },
  { id: 242, round: 14, name: 'Azerbaijan Grand Prix', circuitName: 'Baku City Circuit', city: 'Baku', country: 'Azerbaijan', date: '24–26 Sep', status: 'completed', lat: 40.37, lng: 49.85 },
  { id: 243, round: 15, name: 'Singapore Grand Prix', circuitName: 'Marina Bay Street Circuit', city: 'Marina Bay', country: 'Singapore', date: '02–04 Oct', status: 'completed', lat: 1.29, lng: 103.86 },
  // UPCOMING RACES (Highlight Next 2: United States R18 & Mexico R19)
  { id: 246, round: 18, name: 'United States Grand Prix', circuitName: 'Circuit of the Americas', city: 'Austin, TX', country: 'United States', date: '23–25 Oct', status: 'upcoming', lat: 30.13, lng: -97.64 },
  { id: 247, round: 19, name: 'Mexico City Grand Prix', circuitName: 'Autódromo Hermanos Rodríguez', city: 'Mexico City', country: 'Mexico', date: '30 Oct – 01 Nov', status: 'upcoming', lat: 19.40, lng: -99.09 },
  { id: 248, round: 20, name: 'São Paulo Grand Prix', circuitName: 'Autódromo José Carlos Pace', city: 'São Paulo', country: 'Brazil', date: '06–08 Nov', status: 'upcoming', lat: -23.70, lng: -46.69 },
  { id: 249, round: 21, name: 'Las Vegas Grand Prix', circuitName: 'Las Vegas Strip Circuit', city: 'Las Vegas, NV', country: 'United States', date: '20–22 Nov', status: 'upcoming', lat: 36.11, lng: -115.17 },
  { id: 250, round: 22, name: 'Qatar Grand Prix', circuitName: 'Lusail International Circuit', city: 'Lusail', country: 'Qatar', date: '27–29 Nov', status: 'upcoming', lat: 25.48, lng: 51.45 },
  { id: 251, round: 23, name: 'Abu Dhabi Grand Prix', circuitName: 'Yas Marina Circuit', city: 'Yas Island', country: 'Abu Dhabi', date: '04–06 Dec', status: 'upcoming', lat: 24.46, lng: 54.60 },
];

// Helper to project lat/lon to percentage coordinates on an equirectangular world map
function projectToMap(lat: number, lng: number): { x: number; y: number } {
  // x: -180..180 -> 0..100%
  const x = ((lng + 180) / 360) * 100;
  // y: 85..-60 -> 0..100% (mercator adjustment)
  const y = ((90 - lat) / 180) * 100;
  return { x, y };
}

export default function CircuitWorldMap() {
  const [selectedCircuit, setSelectedCircuit] = useState<CircuitLocation>(
    F1_2026_CIRCUITS.find((c) => c.round === 18) || F1_2026_CIRCUITS[0]
  );

  return (
    <div className="relative isolate rounded border border-hairline-border bg-cockpit-console p-5 font-sans">
      <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-telemetry-cyan">
            <Compass className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '10s' }} />
            <span>GLOBAL GRAND PRIX RADAR</span>
            <span className="text-muted-steel">·</span>
            <span>2026 INTERACTIVE WORLD MAP</span>
          </div>
          <h2 className="text-base font-extrabold text-pure-white mt-0.5">
            Circuit Locations & Geographical Track DNA
          </h2>
        </div>

        <div className="flex items-center gap-4 font-mono text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-personal-best-green" />
            <span className="text-muted-steel">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-f1-crimson animate-ping" />
            <span className="text-pure-white font-bold">Upcoming (Next)</span>
          </div>
        </div>
      </div>

      {/* Main Grid: World Map on Left, Selected Track Detail on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* World Map Canvas */}
        <div className="lg:col-span-2 relative rounded border border-hairline-border bg-carbon-asphalt p-4 min-h-[340px] flex items-center justify-center overflow-hidden">
          {/* Subtle stylized World Map SVG vector background */}
          <svg
            viewBox="0 0 1000 500"
            className="w-full h-full opacity-20 pointer-events-none"
            fill="#334155"
          >
            {/* Equirectangular continent paths */}
            <path d="M150,120 Q180,80 250,90 T320,150 T280,220 T200,200 Z" /> {/* North America */}
            <path d="M260,250 Q310,240 330,300 T300,420 T240,360 Z" /> {/* South America */}
            <path d="M480,100 Q560,70 600,120 T520,180 T460,130 Z" /> {/* Europe */}
            <path d="M460,180 Q560,190 580,260 T520,380 T440,280 Z" /> {/* Africa */}
            <path d="M580,80 Q750,60 850,140 T780,260 T640,200 Z" /> {/* Asia */}
            <path d="M780,320 Q880,310 880,390 T780,410 Z" /> {/* Australia */}
          </svg>

          {/* Grid lines overlay */}
          <div className="absolute inset-0 bg-grid-cockpit opacity-60 pointer-events-none" />

          {/* Interactive Circuit Pins */}
          {F1_2026_CIRCUITS.map((circuit) => {
            const { x, y } = projectToMap(circuit.lat, circuit.lng);
            const isSelected = selectedCircuit.id === circuit.id;
            const isNext = circuit.round === 18;

            return (
              <button
                key={circuit.id}
                onClick={() => setSelectedCircuit(circuit)}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 group z-20 focus:outline-none"
                style={{ left: `${Math.max(5, Math.min(95, x))}%`, top: `${Math.max(10, Math.min(90, y))}%` }}
                title={`R${circuit.round}: ${circuit.name} (${circuit.city})`}
              >
                {/* Pin Beacon */}
                <div className="relative flex items-center justify-center">
                  {isNext && (
                    <span className="absolute h-5 w-5 rounded-full bg-f1-crimson opacity-75 animate-ping" />
                  )}
                  {isSelected && (
                    <span className="absolute h-6 w-6 rounded-full border-2 border-telemetry-cyan animate-pulse" />
                  )}
                  <span
                    className={`h-2.5 w-2.5 rounded-full transition-transform group-hover:scale-150 ${
                      isNext
                        ? 'bg-f1-crimson ring-2 ring-white'
                        : circuit.status === 'upcoming'
                        ? 'bg-telemetry-amber'
                        : 'bg-personal-best-green'
                    }`}
                  />
                </div>

                {/* Floating Round Label on hover or select */}
                {(isSelected || isNext) && (
                  <span className="absolute top-3 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-cockpit-elevated border border-hairline-border font-mono text-[9px] font-bold text-pure-white whitespace-nowrap shadow">
                    R{circuit.round} {circuit.city}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Track DNA & Layout Vector Card */}
        <div className="rounded border border-hairline-border bg-cockpit-elevated p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-f1-crimson">
                ROUND {selectedCircuit.round} OF 23
              </span>
              <span
                className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                  selectedCircuit.status === 'upcoming'
                    ? 'bg-f1-crimson/20 text-f1-crimson border border-f1-crimson/40'
                    : 'bg-personal-best-green/20 text-personal-best-green border border-personal-best-green/40'
                }`}
              >
                {selectedCircuit.status}
              </span>
            </div>

            <h3 className="mt-1 text-lg font-black text-pure-white">
              {selectedCircuit.name}
            </h3>
            <p className="font-mono text-xs text-muted-steel flex items-center gap-1 mt-0.5">
              <MapPin className="h-3.5 w-3.5 text-f1-crimson" />
              <span>{selectedCircuit.circuitName} · {selectedCircuit.city}, {selectedCircuit.country}</span>
            </p>

            {/* TRACK LAYOUT VECTOR LINES */}
            <div className="mt-3 rounded border border-hairline-border bg-carbon-asphalt p-2">
              <CircuitTrackOutline
                country={selectedCircuit.country}
                circuitName={selectedCircuit.circuitName}
                strokeColor={selectedCircuit.round === 18 ? '#00E5FF' : '#00E676'}
                className="h-36"
              />
            </div>

            {/* Quick Circuit Specs */}
            <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="rounded bg-cockpit-panel p-2">
                <span className="text-[10px] text-muted-steel uppercase block">Schedule Dates</span>
                <span className="font-bold text-pure-white">{selectedCircuit.date}</span>
              </div>
              <div className="rounded bg-cockpit-panel p-2">
                <span className="text-[10px] text-muted-steel uppercase block">Circuit Type</span>
                <span className="font-bold text-pure-white">
                  {selectedCircuit.name.includes('City') || selectedCircuit.name.includes('Monaco') || selectedCircuit.name.includes('Singapore') || selectedCircuit.name.includes('Vegas')
                    ? 'Street Circuit'
                    : 'Permanent Track'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-hairline-border flex items-center justify-between">
            <span className="font-mono text-[11px] text-muted-steel">
              COORDINATES: {selectedCircuit.lat}°, {selectedCircuit.lng}°
            </span>
            {selectedCircuit.status === 'completed' && (
              <a
                href={`/races/${selectedCircuit.id}`}
                className="font-mono text-xs font-bold text-telemetry-cyan hover:underline flex items-center gap-1"
              >
                <span>Race Pace</span>
                <ChevronRight className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
