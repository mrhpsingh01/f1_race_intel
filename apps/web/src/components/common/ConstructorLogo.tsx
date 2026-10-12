'use client';

import React, { useState } from 'react';

// Constructor Team Configs with official Brand Logos & Colors
interface TeamConfig {
  short: string;
  color: string;
  border: string;
  logoUrl?: string;
  bgDark?: string;
}

const TEAM_CONFIGS: Record<string, TeamConfig> = {
  'Mercedes': { short: 'MERC', color: '#27F4D2', border: '#27F4D2', logoUrl: '/images/teams/2026-mercedes-normalized-logo.avif', bgDark: '#0B1E1C' },
  'Mercedes AMG': { short: 'MERC', color: '#27F4D2', border: '#27F4D2', logoUrl: '/images/teams/2026-mercedes-normalized-logo.avif', bgDark: '#0B1E1C' },
  'Ferrari': { short: 'SF', color: '#E8002D', border: '#E8002D', logoUrl: '/images/teams/ferrari-normalized-logo.avif', bgDark: '#20080B' },
  'Scuderia Ferrari': { short: 'SF', color: '#E8002D', border: '#E8002D', logoUrl: '/images/teams/ferrari-normalized-logo.avif', bgDark: '#20080B' },
  'Red Bull': { short: 'RBR', color: '#3671C6', border: '#3671C6', logoUrl: '/images/teams/rbr-normalized-logo.avif', bgDark: '#09152B' },
  'Red Bull Racing': { short: 'RBR', color: '#3671C6', border: '#3671C6', logoUrl: '/images/teams/rbr-normalized-logo.avif', bgDark: '#09152B' },
  'McLaren': { short: 'MCL', color: '#FF8000', border: '#FF8000', logoUrl: '/images/teams/mclaren-normalized-logo.avif', bgDark: '#261403' },
  'Aston Martin': { short: 'AMR', color: '#229971', border: '#229971', logoUrl: '/images/teams/aston-martin-normalized-logo.avif', bgDark: '#0A1C16' },
  'Alpine': { short: 'ALP', color: '#0093CC', border: '#0093CC', logoUrl: '/images/teams/alpine-normalized-logo.avif', bgDark: '#051824' },
  'Alpine F1 Team': { short: 'ALP', color: '#0093CC', border: '#0093CC', logoUrl: '/images/teams/alpine-normalized-logo.avif', bgDark: '#051824' },
  'Williams': { short: 'WIL', color: '#00A0DE', border: '#00A0DE', logoUrl: '/images/teams/2026-williams-normalized-logo.avif', bgDark: '#061726' },
  'Williams Racing': { short: 'WIL', color: '#00A0DE', border: '#00A0DE', logoUrl: '/images/teams/2026-williams-normalized-logo.avif', bgDark: '#061726' },
  'RB': { short: 'VCARB', color: '#6692FF', border: '#6692FF', logoUrl: '/images/teams/rb-normalized-logo.avif', bgDark: '#0E172E' },
  'RB F1 Team': { short: 'VCARB', color: '#6692FF', border: '#6692FF', logoUrl: '/images/teams/rb-normalized-logo.avif', bgDark: '#0E172E' },
  'Racing Bulls': { short: 'VCARB', color: '#6692FF', border: '#6692FF', logoUrl: '/images/teams/rb-normalized-logo.avif', bgDark: '#0E172E' },
  'Kick Sauber': { short: 'SAU', color: '#52E252', border: '#52E252', logoUrl: '/images/teams/audi-normalized-logo.avif', bgDark: '#0A200A' },
  'Sauber': { short: 'SAU', color: '#52E252', border: '#52E252', logoUrl: '/images/teams/audi-normalized-logo.avif', bgDark: '#0A200A' },
  'Audi': { short: 'AUDI', color: '#F50537', border: '#F50537', logoUrl: '/images/teams/audi-normalized-logo.avif', bgDark: '#20080C' },
  'Haas': { short: 'HAAS', color: '#B6BABD', border: '#B6BABD', logoUrl: '/images/teams/haas-normalized-logo.avif', bgDark: '#1C1C1E' },
  'Haas F1 Team': { short: 'HAAS', color: '#B6BABD', border: '#B6BABD', logoUrl: '/images/teams/haas-normalized-logo.avif', bgDark: '#1C1C1E' },
  'Cadillac': { short: 'CAD', color: '#C0A060', border: '#C0A060', logoUrl: '/images/teams/cadillac-normalized-logo.avif', bgDark: '#241D10' },
  'Cadillac F1 Team': { short: 'CAD', color: '#C0A060', border: '#C0A060', logoUrl: '/images/teams/cadillac-normalized-logo.avif', bgDark: '#241D10' },
};

interface ConstructorLogoProps {
  teamName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  className?: string;
}

export function ConstructorLogo({
  teamName,
  size = 'md',
  showName = true,
  className = '',
}: ConstructorLogoProps) {
  const [imageError, setImageError] = useState(false);
  const normalizedKey = Object.keys(TEAM_CONFIGS).find(
    (k) => k.toLowerCase() === (teamName || '').toLowerCase()
  );
  const config = (normalizedKey && TEAM_CONFIGS[normalizedKey]) || {
    short: (teamName || 'F1').slice(0, 3).toUpperCase(),
    color: '#3b82f6',
    border: '#3b82f6',
    bgDark: '#0d131f',
  };

  const dimensions = {
    sm: { box: 'h-6 w-8', img: 'max-h-4 max-w-[28px]', text: 'text-[11px]' },
    md: { box: 'h-7 w-10', img: 'max-h-5 max-w-[34px]', text: 'text-xs' },
    lg: { box: 'h-9 w-14', img: 'max-h-7 max-w-[48px]', text: 'text-sm' },
    xl: { box: 'h-11 w-16', img: 'max-h-8 max-w-[56px]', text: 'text-base font-bold' },
  };

  const dim = dimensions[size];

  return (
    <div className={`inline-flex items-center gap-2 group ${className}`}>
      {/* Brand Emblem Container */}
      <div
        className={`relative inline-flex items-center justify-center rounded-md px-1 py-0.5 border transition-all duration-200 group-hover:scale-105 ${dim.box}`}
        style={{
          backgroundColor: config.bgDark || '#11141A',
          borderColor: `${config.border}50`,
          boxShadow: `0 0 10px ${config.color}20`,
        }}
        title={teamName}
      >
        {config.logoUrl && !imageError ? (
          <img
            src={config.logoUrl}
            alt={`${teamName} logo`}
            className={`w-auto object-contain filter drop-shadow ${dim.img}`}
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <span
            className="font-mono font-black tracking-wider text-[10px]"
            style={{ color: config.color }}
          >
            {config.short}
          </span>
        )}
      </div>

      {showName && (
        <span className={`font-semibold text-pure-white truncate ${dim.text}`}>
          {teamName}
        </span>
      )}
    </div>
  );
}

// Driver information: racing numbers, livery colors, official photo URLs
interface DriverDetails {
  num: string;
  color: string;
  fullName: string;
  photoUrl: string;
}

const DRIVER_INFO: Record<string, DriverDetails> = {
  'ANT': { num: '12', color: '#27F4D2', fullName: 'Andrea Kimi Antonelli', photoUrl: '/images/drivers/ant.png' },
  'RUS': { num: '63', color: '#27F4D2', fullName: 'George Russell', photoUrl: '/images/drivers/rus.png' },
  'HAM': { num: '44', color: '#E8002D', fullName: 'Lewis Hamilton', photoUrl: '/images/drivers/ham.png' },
  'LEC': { num: '16', color: '#E8002D', fullName: 'Charles Leclerc', photoUrl: '/images/drivers/lec.png' },
  'VER': { num: '1', color: '#3671C6', fullName: 'Max Verstappen', photoUrl: '/images/drivers/ver.png' },
  'NOR': { num: '4', color: '#FF8000', fullName: 'Lando Norris', photoUrl: '/images/drivers/nor.png' },
  'PIA': { num: '81', color: '#FF8000', fullName: 'Oscar Piastri', photoUrl: '/images/drivers/pia.png' },
  'HAD': { num: '37', color: '#3671C6', fullName: 'Isack Hadjar', photoUrl: '/images/drivers/had.png' },
  'LAW': { num: '30', color: '#6692FF', fullName: 'Liam Lawson', photoUrl: '/images/drivers/law.png' },
  'SAI': { num: '55', color: '#00A0DE', fullName: 'Carlos Sainz', photoUrl: '/images/drivers/sai.png' },
  'ALO': { num: '14', color: '#229971', fullName: 'Fernando Alonso', photoUrl: '/images/drivers/alo.png' },
  'ALB': { num: '23', color: '#00A0DE', fullName: 'Alexander Albon', photoUrl: '/images/drivers/alb.png' },
  'GAS': { num: '10', color: '#0093CC', fullName: 'Pierre Gasly', photoUrl: '/images/drivers/gas.png' },
  'TSU': { num: '22', color: '#6692FF', fullName: 'Yuki Tsunoda', photoUrl: '/images/drivers/tsu.png' },
  'OCO': { num: '31', color: '#B6BABD', fullName: 'Esteban Ocon', photoUrl: '/images/drivers/oco.png' },
  'HUL': { num: '27', color: '#52E252', fullName: 'Nico Hülkenberg', photoUrl: '/images/drivers/hul.png' },
  'BOT': { num: '77', color: '#52E252', fullName: 'Valtteri Bottas', photoUrl: '/images/drivers/bot.png' },
  'PER': { num: '11', color: '#3671C6', fullName: 'Sergio Perez', photoUrl: '/images/drivers/per.png' },
  'STR': { num: '18', color: '#229971', fullName: 'Lance Stroll', photoUrl: '/images/drivers/str.png' },
  'BEA': { num: '87', color: '#B6BABD', fullName: 'Oliver Bearman', photoUrl: '/images/drivers/bea.png' },
  'BOR': { num: '5', color: '#F50537', fullName: 'Gabriel Bortoleto', photoUrl: '/images/drivers/bor.png' },
  'COL': { num: '43', color: '#0093CC', fullName: 'Franco Colapinto', photoUrl: '/images/drivers/col.png' },
  'LIN': { num: '41', color: '#6692FF', fullName: 'Arvid Lindblad', photoUrl: '/images/drivers/lin.png' },
  'MAG': { num: '20', color: '#B6BABD', fullName: 'Kevin Magnussen', photoUrl: '/images/drivers/mag.png' },
  'ZHO': { num: '24', color: '#52E252', fullName: 'Zhou Guanyu', photoUrl: '/images/drivers/zho.png' },
  'SAR': { num: '2', color: '#00A0DE', fullName: 'Logan Sargeant', photoUrl: '/images/drivers/sar.png' },
  'RIC': { num: '3', color: '#6692FF', fullName: 'Daniel Ricciardo', photoUrl: '/images/drivers/ric.png' },
};

import { useDriverModal } from '@/context/DriverModalContext';

interface DriverAvatarProps {
  driverCode: string;
  driverName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showNumber?: boolean;
  className?: string;
  clickable?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export function DriverAvatar({
  driverCode,
  driverName = '',
  size = 'md',
  showNumber = true,
  className = '',
  clickable = true,
  onClick,
}: DriverAvatarProps) {
  const [photoError, setPhotoError] = useState(false);
  const { openDriver } = useDriverModal();
  const codeUpper = (driverCode || '').toUpperCase().trim();
  const info = DRIVER_INFO[codeUpper] || {
    num: '00',
    color: '#E8002D',
    fullName: driverName || driverCode,
    photoUrl: `/images/drivers/${codeUpper.toLowerCase()}.png`,
  };

  const dimensions = {
    sm: {
      px: 32,
      container: 'w-8 h-8',
      text: 'text-[10px]',
      badge: 'text-[7px] px-0.5 py-0',
    },
    md: {
      px: 44,
      container: 'w-[44px] h-[44px]',
      text: 'text-xs',
      badge: 'text-[8px] px-1 py-0.5',
    },
    lg: {
      px: 56,
      container: 'w-[56px] h-[56px]',
      text: 'text-sm font-bold',
      badge: 'text-[9px] px-1.5 py-0.5',
    },
    xl: {
      px: 72,
      container: 'w-[72px] h-[72px]',
      text: 'text-base font-extrabold',
      badge: 'text-[10px] px-2 py-0.5',
    },
  };

  const dim = dimensions[size];
  const isClickable = clickable !== false;

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick(e);
      return;
    }
    if (isClickable && codeUpper) {
      e.stopPropagation();
      openDriver(codeUpper);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`relative inline-flex items-center justify-center flex-shrink-0 group ${isClickable ? 'cursor-pointer hover:opacity-95' : ''} ${className}`}
      title={`${driverName || info.fullName || driverCode}${isClickable ? ' · Click to view driver profile' : ''}`}
    >
      {/* Outer Glow & Livery Rim */}
      <div
        className={`relative rounded-full overflow-hidden border-2 transition-transform duration-300 group-hover:scale-105 flex items-center justify-center bg-zinc-950 flex-shrink-0 ${isClickable ? 'group-hover:ring-2 group-hover:ring-red-500/80' : ''} ${dim.container}`}
        style={{
          width: `${dim.px}px`,
          height: `${dim.px}px`,
          minWidth: `${dim.px}px`,
          minHeight: `${dim.px}px`,
          maxWidth: `${dim.px}px`,
          maxHeight: `${dim.px}px`,
          borderColor: info.color,
          boxShadow: `0 0 12px ${info.color}40`,
        }}
      >
        {/* Driver Photo Cutout */}
        {!photoError ? (
          <img
            src={info.photoUrl}
            alt={info.fullName}
            className="w-full h-full object-cover object-top filter contrast-105 brightness-105 block"
            style={{
              width: '100%',
              height: '100%',
              maxWidth: '100%',
              maxHeight: '100%',
            }}
            onError={() => setPhotoError(true)}
            loading="lazy"
          />
        ) : (
          /* Fallback Monogram Avatar */
          <div
            className="w-full h-full flex items-center justify-center font-mono font-black text-pure-white"
            style={{
              background: `radial-gradient(circle at 50% 30%, ${info.color}50, #0F1218)`,
            }}
          >
            <span className={dim.text}>{codeUpper}</span>
          </div>
        )}
      </div>

      {/* Racing Number Pill */}
      {showNumber && info.num && (
        <span
          className={`absolute -bottom-1 -right-1 font-mono font-black rounded-md border border-zinc-800 bg-carbon-asphalt text-pure-white leading-none shadow-md ${dim.badge}`}
          style={{
            borderColor: `${info.color}80`,
            boxShadow: `0 0 6px ${info.color}30`,
          }}
        >
          #{info.num}
        </span>
      )}
    </div>
  );
}
