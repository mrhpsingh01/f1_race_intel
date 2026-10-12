'use client';

import React from 'react';

// Precision SVG path coordinates for F1 circuits
const CIRCUIT_PATHS: Record<string, { path: string; viewBox: string; name: string }> = {
  // Circuit of the Americas (Austin, USA) - Next Race (R18)
  'united-states': {
    viewBox: '0 0 300 200',
    name: 'Circuit of the Americas',
    path: 'M 45,150 L 80,45 L 105,75 L 125,60 L 145,85 L 165,70 L 195,95 L 260,95 L 265,115 L 230,120 L 225,145 L 250,155 L 245,175 L 210,170 L 175,185 L 135,160 L 105,170 L 85,150 Z',
  },
  'cota': {
    viewBox: '0 0 300 200',
    name: 'Circuit of the Americas',
    path: 'M 45,150 L 80,45 L 105,75 L 125,60 L 145,85 L 165,70 L 195,95 L 260,95 L 265,115 L 230,120 L 225,145 L 250,155 L 245,175 L 210,170 L 175,185 L 135,160 L 105,170 L 85,150 Z',
  },
  // Autódromo Hermanos Rodríguez (Mexico City) - Next Race (R19)
  'mexico': {
    viewBox: '0 0 300 200',
    name: 'Autódromo Hermanos Rodríguez',
    path: 'M 40,165 L 250,165 L 260,145 L 230,125 L 250,100 L 220,70 L 180,90 L 140,75 L 110,95 L 80,85 L 65,105 L 50,140 Z',
  },
  // Autódromo José Carlos Pace (Interlagos - São Paulo) - R20
  'brazil': {
    viewBox: '0 0 300 200',
    name: 'Autódromo José Carlos Pace (Interlagos)',
    path: 'M 60,70 L 110,45 L 150,60 L 130,95 L 160,120 L 200,95 L 245,110 L 255,145 L 210,165 L 150,160 L 100,175 L 70,140 L 55,100 Z',
  },
  // Las Vegas Strip Circuit - R21
  'las-vegas': {
    viewBox: '0 0 300 200',
    name: 'Las Vegas Strip Circuit',
    path: 'M 50,50 L 250,50 L 260,80 L 240,110 L 250,150 L 180,160 L 120,150 L 80,165 L 50,140 L 60,90 Z',
  },
  // Lusail International Circuit (Qatar) - R22
  'qatar': {
    viewBox: '0 0 300 200',
    name: 'Lusail International Circuit',
    path: 'M 40,160 L 260,160 L 255,120 L 220,110 L 240,75 L 190,55 L 150,85 L 110,65 L 80,95 L 55,130 Z',
  },
  // Yas Marina Circuit (Abu Dhabi) - R23
  'abu-dhabi': {
    viewBox: '0 0 300 200',
    name: 'Yas Marina Circuit',
    path: 'M 50,150 L 120,40 L 160,55 L 140,85 L 220,90 L 260,115 L 240,160 L 190,145 L 160,175 L 110,165 L 80,180 Z',
  },
  // Marina Bay Street Circuit (Singapore)
  'singapore': {
    viewBox: '0 0 300 200',
    name: 'Marina Bay Street Circuit',
    path: 'M 50,80 L 110,50 L 160,65 L 220,55 L 250,85 L 240,135 L 210,160 L 150,150 L 120,175 L 80,165 L 55,130 Z',
  },
  // Silverstone Circuit (Great Britain)
  'great-britain': {
    viewBox: '0 0 300 200',
    name: 'Silverstone Circuit',
    path: 'M 70,160 L 120,120 L 160,140 L 210,110 L 250,70 L 230,45 L 170,55 L 120,80 L 80,60 L 50,90 L 60,130 Z',
  },
  // Spa-Francorchamps (Belgium)
  'belgium': {
    viewBox: '0 0 300 200',
    name: 'Circuit de Spa-Francorchamps',
    path: 'M 60,60 L 120,40 L 180,60 L 250,90 L 260,140 L 210,165 L 160,135 L 120,160 L 70,150 L 50,110 Z',
  },
  // Autodromo Nazionale Monza (Italy)
  'italy': {
    viewBox: '0 0 300 200',
    name: 'Autodromo Nazionale Monza',
    path: 'M 40,155 L 260,155 L 265,115 L 210,85 L 160,95 L 110,65 L 70,50 L 45,90 Z',
  },
  // Circuit de Monaco
  'monaco': {
    viewBox: '0 0 300 200',
    name: 'Circuit de Monaco',
    path: 'M 60,140 L 100,70 L 140,55 L 170,75 L 210,65 L 245,95 L 230,135 L 190,125 L 150,155 L 110,140 L 80,160 Z',
  },
};

interface CircuitTrackOutlineProps {
  country?: string;
  circuitName?: string;
  className?: string;
  strokeColor?: string;
  glowColor?: string;
}

export default function CircuitTrackOutline({
  country = '',
  circuitName = '',
  className = 'w-full h-32',
  strokeColor = '#00E5FF',
  glowColor = 'rgba(0, 229, 255, 0.4)',
}: CircuitTrackOutlineProps) {
  // Normalize lookup key from country or circuit name
  const rawKey = `${country} ${circuitName}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  let match = CIRCUIT_PATHS['united-states'];
  for (const [key, val] of Object.entries(CIRCUIT_PATHS)) {
    if (rawKey.includes(key)) {
      match = val;
      break;
    }
  }

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox={match.viewBox}
        className="w-full h-full p-2 overflow-visible"
        style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
      >
        {/* Track outline background lane */}
        <path
          d={match.path}
          fill="none"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Track dynamic racing line */}
        <path
          d={match.path}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Start / Finish line beacon */}
        <circle cx="55" cy="150" r="3.5" fill="#E10600" />
      </svg>
      <div className="absolute bottom-1 right-2 font-mono text-[9px] uppercase tracking-wider text-muted-steel">
        TRACK LAYOUT
      </div>
    </div>
  );
}
