'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, DriverStanding } from '@/lib/api';
import { DriverDeepDiveDashboard } from '@/components/standings/DriverDeepDiveDashboard';
import { ChevronLeft, Trophy, Activity, Flag } from 'lucide-react';

export default function DriverDetailPage() {
  const params = useParams();
  const driverCode = (params?.code as string)?.toUpperCase() || 'ANT';
  const [selectedSeason, setSelectedSeason] = useState<number>(2026);
  const [standings, setStandings] = useState<DriverStanding[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadStandings() {
      setLoading(true);
      try {
        const res = await api.getDriverStandings(selectedSeason);
        setStandings(res.standings || []);
      } catch (err) {
        console.warn('Failed to load standings for driver page:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStandings();
  }, [selectedSeason]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Navigation Breadcrumb */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/standings"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back to Championship Standings</span>
        </Link>

        {/* Season Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Season:
          </label>
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(Number(e.target.value))}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white focus:border-red-500 focus:outline-none"
          >
            {[2026, 2025, 2024, 2023, 2022, 2021].map((s) => (
              <option key={s} value={s}>{s} Championship</option>
            ))}
          </select>
        </div>
      </div>

      {/* Driver Deep Dive View */}
      {loading ? (
        <div className="flex h-72 items-center justify-center text-zinc-400 font-mono text-sm">
          Loading {driverCode} driver profile...
        </div>
      ) : (
        <DriverDeepDiveDashboard
          initialDriverCode={driverCode}
          season={selectedSeason}
          availableDrivers={standings}
        />
      )}
    </div>
  );
}
