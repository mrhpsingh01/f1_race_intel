'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Radio, Activity, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/', label: 'Cockpit Dashboard' },
  { href: '/telemetry', label: 'Telemetry Duel' },
  { href: '/predictor', label: 'Podium Predictor' },
  { href: '/head-to-head', label: 'Head to Head' },
  { href: '/pit-stops', label: 'Pit Stops' },
  { href: '/races', label: 'Races & Calendar' },
  { href: '/standings', label: 'Standings' },
  { href: '/assistant', label: 'Pit Wall AI' },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-carbon-asphalt/95 backdrop-blur-md border-b border-hairline-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Pit Wall Indicator */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex items-center gap-2 pl-2 border-l-4 border-f1-crimson">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-f1-crimson">PITWALL.OS</span>
              <span className="text-white font-extrabold text-sm tracking-tight group-hover:text-telemetry-cyan transition-colors">
                F1 RACE INTEL
              </span>
            </div>
            <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 rounded bg-cockpit-elevated border border-hairline-border text-[10px] font-mono text-muted-steel">
              <span className="h-1.5 w-1.5 rounded-full bg-personal-best-green animate-pulse" />
              <span>LIVE TELEMETRY</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = link.href === '/' ? pathname === '/' : pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-3 py-1.5 rounded text-xs font-medium tracking-wide transition-all duration-150',
                    isActive
                      ? 'bg-cockpit-elevated text-telemetry-cyan border border-telemetry-cyan/30 shadow-[0_0_12px_rgba(0,229,255,0.15)]'
                      : 'text-muted-steel hover:text-pure-white hover:bg-cockpit-elevated/70'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Status Badge & Mobile Hamburger */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-cockpit-console border border-hairline-border text-xs font-mono text-zinc-300">
              <Radio className="h-3 w-3 text-personal-best-green animate-pulse" />
              <span className="text-[11px] text-zinc-400">SESSION:</span>
              <span className="font-semibold text-pure-white">2026 LIVE</span>
            </div>

            <button
              className="md:hidden p-2 rounded text-zinc-400 hover:text-white hover:bg-cockpit-elevated transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-carbon-asphalt border-t border-hairline-border px-4 py-3 space-y-1">
          {navLinks.map((link) => {
            const isActive = link.href === '/' ? pathname === '/' : pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'block px-3 py-2 rounded text-xs font-medium tracking-wide transition-colors',
                  isActive
                    ? 'bg-cockpit-elevated text-telemetry-cyan border border-telemetry-cyan/30'
                    : 'text-muted-steel hover:text-white hover:bg-cockpit-elevated'
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
