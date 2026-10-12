import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function msToLapTime(ms: number): string {
  if (!ms) return '--';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  }
  return `${seconds}.${String(millis).padStart(3, '0')}`;
}

export function formatDeltaMs(ms: number): string {
  const sign = ms >= 0 ? '+' : '-';
  const abs = Math.abs(ms);
  return `${sign}${(abs / 1000).toFixed(3)}s`;
}

export const COMPOUND_COLORS: Record<string, string> = {
  SOFT: '#e8002d',
  MEDIUM: '#ffd700',
  HARD: '#ffffff',
  INTERMEDIATE: '#39b54a',
  WET: '#0067ff',
  UNKNOWN: '#888888',
};

export const DRIVER_COLORS = [
  '#e8002d', '#ff8700', '#39b54a', '#0067ff', '#dc0000',
  '#005aff', '#ffffff', '#00a0dd', '#aaaa00', '#900000',
  '#ff1801', '#007fff', '#2293d1', '#00352f', '#006f62',
  '#701d46', '#0600ef', '#00d2be', '#ff8181', '#4e7c09',
];
