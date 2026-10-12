import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Database, Calendar, BarChart3, AlertTriangle, ArrowRight } from 'lucide-react';

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12 border-b border-zinc-800 pb-8">
        <div className="text-xs font-semibold uppercase tracking-wider text-red-500">
          Engineering & Modeling Documentation
        </div>
        <h1 className="mt-2 text-4xl font-extrabold text-white">System Methodology & Data Limits</h1>
        <p className="mt-2 text-base text-zinc-400">
          Transparency is critical for racing intelligence. Here we document the exact data cutoffs, ingestion pipelines, calibration mathematics, and acknowledged limitations.
        </p>
      </div>

      <div className="space-y-12 text-zinc-300">
        {/* Section 1: Data Sources */}
        <section>
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <Database className="h-5 w-5 text-red-500" />
            <h2>1. Canonical Data Sources</h2>
          </div>
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4 text-sm leading-relaxed">
            <p>
              To ensure data reproducibility and eliminate subtle revision discrepancies, this application enforces a single canonical source for each domain:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-zinc-400">
              <li>
                <strong className="text-zinc-200">Official Classifications & Calendars:</strong> Jolpica F1 API (community-maintained Ergast archive successor with paginated endpoints and custom User-Agent tracking).
              </li>
              <li>
                <strong className="text-zinc-200">Lap Timing, Stints, & Weather:</strong> FastF1 Python library caching official live-timing logs.
              </li>
              <li>
                <strong className="text-zinc-200">High-Frequency Telemetry:</strong> FastF1 / OpenF1 20Hz car data interpolated to uniform 20m distance grids and persisted as Apache Parquet files.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 2: Strict Temporal Cutoffs */}
        <section>
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <Calendar className="h-5 w-5 text-red-500" />
            <h2>2. Strict Temporal Prediction Cutoffs</h2>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 text-sm">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h3 className="font-bold uppercase text-xs tracking-wider text-red-400">
                Pre-Weekend Cutoff
              </h3>
              <p className="mt-2 text-zinc-400 leading-relaxed">
                Locked at 00:00 UTC on the Friday of the Grand Prix weekend. Utilizes strictly historical driver form, team momentum, and track history from earlier events. Practice sessions and qualifying are strictly excluded.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h3 className="font-bold uppercase text-xs tracking-wider text-red-400">
                Post-Qualifying Cutoff
              </h3>
              <p className="mt-2 text-zinc-400 leading-relaxed">
                Locked 2 hours after official Qualifying conclusion. Ingests confirmed starting grid positions, gap-to-pole in milliseconds, and Q3 progression, while accounting for confirmed penalties.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Telemetry Alignment */}
        <section>
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <BarChart3 className="h-5 w-5 text-red-500" />
            <h2>3. Distance Axis Telemetry Interpolation</h2>
          </div>
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-sm leading-relaxed space-y-3">
            <p>
              Telemetry samples recorded on differing cars do not occur at identical GPS timestamps or identical circuit meters. To compare laps fairly:
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-zinc-400">
              <li>Both traces are mapped against circuit distance d.</li>
              <li>A regular 20-meter grid is generated between distance 0 and the lap distance.</li>
              <li>Speed, throttle, braking, and gear traces are linear-interpolated onto this grid.</li>
              <li>Cumulative time delta is calculated via sum of (delta_d / vA - delta_d / vB).</li>
            </ol>
          </div>
        </section>

        {/* Section 4: Known Limits */}
        <section>
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2>4. Acknowledged Data Limitations</h2>
          </div>
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-sm leading-relaxed space-y-3 text-zinc-400">
            <p>
              &bull; <strong>Independent Driver Probabilities:</strong> Currently, probabilities are estimated per-driver and calibrated via Isotonic Regression. In future releases, race-level Plackett-Luce ranking models will be introduced so probabilities across the 20 cars sum to exactly 3.0.
            </p>
            <p>
              &bull; <strong>Safety Car & Red Flag Noise:</strong> Tyre degradation algorithms filter out caution laps; however, track temperature fluctuations during extended interruptions still introduce variance.
            </p>
          </div>
        </section>
      </div>

      <div className="mt-12 flex justify-center">
        <Link
          href="/races"
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-500 transition"
        >
          <span>Explore Race Intel</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
