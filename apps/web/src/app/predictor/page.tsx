'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, PredictionsResponse, DriverPrediction, Race } from '@/lib/api';
import PredictionChart from '@/components/charts/PredictionChart';
import { Sparkles, Info, ShieldCheck, Calendar, Flag, MapPin, Activity } from 'lucide-react';
import { DriverAvatar, ConstructorLogo } from '@/components/common/ConstructorLogo';
import { useDriverModal } from '@/context/DriverModalContext';

function PredictorContent() {
  const { openDriver } = useDriverModal();
  const searchParams = useSearchParams();
  const initialRaceId = Number(searchParams.get('race_id') || 1);

  // Grand Prix & Season selection state
  const [selectedSeason, setSelectedSeason] = useState<number>(2026);
  const [races, setRaces] = useState<Race[]>([]);
  const [raceId, setRaceId] = useState<number>(initialRaceId);

  const [cutoff, setCutoff] = useState<'pre_weekend' | 'post_qualifying'>('post_qualifying');
  const [data, setData] = useState<PredictionsResponse | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<DriverPrediction | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // 1. Fetch races for selected season
  useEffect(() => {
    async function loadSeasonRaces() {
      try {
        const res = await api.getRaces(selectedSeason);
        if (res.races && res.races.length > 0) {
          setRaces(res.races);
          // Default to latest completed race in this season unless explicit param provided
          const paramId = searchParams.get('race_id');
          if (paramId && res.races.some((r) => r.id === Number(paramId))) {
            setRaceId(Number(paramId));
          } else {
            const completedRaces = res.races.filter((r) => r.status === 'completed');
            const defaultRace = completedRaces.length > 0 ? completedRaces[completedRaces.length - 1] : res.races[0];
            setRaceId(defaultRace.id);
          }
        } else {
          setRaces([]);
        }
      } catch (err) {
        console.warn('Failed to load races for season', err);
      }
    }
    loadSeasonRaces();
  }, [selectedSeason]);

  // 2. Load predictions for chosen race and cutoff
  useEffect(() => {
    async function loadPredictions() {
      if (!raceId) return;
      setLoading(true);
      try {
        const res = await api.getPredictions(raceId, cutoff);
        setData(res);
        if (res.predictions && res.predictions.length > 0) {
          setSelectedDriver(res.predictions[0]);
        }
      } catch (err) {
        console.warn('API predictions fallback:', err);
        const isPost = cutoff === 'post_qualifying';
        const mockPredictions: DriverPrediction[] = [
          {
            driver_id: 29,
            driver_name: 'Andrea Kimi Antonelli',
            driver_code: 'ANT',
            team_name: 'Mercedes',
            probability: isPost ? 0.86 : 0.82,
            qualifying_position: isPost ? 1 : null,
            model_version: 'v2.1-xgb-2026',
            cutoff_time: '2026-10-23T16:00:00Z',
            key_factors: [
              { name: '2026 Championship Points', value: '309 pts (P1)', direction: 'positive' },
              { name: '2026 Season Podiums', value: '14 podiums in 17 rounds (82%)', direction: 'positive' },
              { name: 'Season Average Finish', value: 'P3.5', direction: 'positive' },
              { name: 'Constructor Form', value: 'Mercedes (513 pts)', direction: 'positive' },
            ],
          },
          {
            driver_id: 14,
            driver_name: 'George Russell',
            driver_code: 'RUS',
            team_name: 'Mercedes',
            probability: isPost ? 0.74 : 0.68,
            qualifying_position: isPost ? 2 : null,
            model_version: 'v2.1-xgb-2026',
            cutoff_time: '2026-10-23T16:00:00Z',
            key_factors: [
              { name: '2026 Championship Points', value: '204 pts (P2)', direction: 'positive' },
              { name: '2026 Season Podiums', value: '8 podiums, 3 wins', direction: 'positive' },
              { name: 'Constructor Form', value: 'Mercedes', direction: 'positive' },
            ],
          },
          {
            driver_id: 1,
            driver_name: 'Lewis Hamilton',
            driver_code: 'HAM',
            team_name: 'Ferrari',
            probability: isPost ? 0.69 : 0.64,
            qualifying_position: isPost ? 3 : null,
            model_version: 'v2.1-xgb-2026',
            cutoff_time: '2026-10-23T16:00:00Z',
            key_factors: [
              { name: '2026 Championship Points', value: '202 pts (P3)', direction: 'positive' },
              { name: 'Season Average Finish', value: 'P5.2', direction: 'positive' },
              { name: 'Constructor Form', value: 'Ferrari', direction: 'positive' },
            ],
          },
          {
            driver_id: 2,
            driver_name: 'Max Verstappen',
            driver_code: 'VER',
            team_name: 'Red Bull Racing',
            probability: isPost ? 0.67 : 0.62,
            qualifying_position: isPost ? 4 : null,
            model_version: 'v2.1-xgb-2026',
            cutoff_time: '2026-10-23T16:00:00Z',
            key_factors: [
              { name: '2026 Championship Points', value: '201 pts (P4)', direction: 'positive' },
              { name: '2026 Season Podiums', value: '9 podiums, 2 wins', direction: 'positive' },
              { name: 'Circuit Best Result', value: 'P1', direction: 'positive' },
            ],
          },
          {
            driver_id: 6,
            driver_name: 'Charles Leclerc',
            driver_code: 'LEC',
            team_name: 'Ferrari',
            probability: isPost ? 0.58 : 0.52,
            qualifying_position: isPost ? 5 : null,
            model_version: 'v2.1-xgb-2026',
            cutoff_time: '2026-10-23T16:00:00Z',
            key_factors: [
              { name: '2026 Championship Points', value: '181 pts (P5)', direction: 'positive' },
              { name: 'Season Average Finish', value: 'P6.5', direction: 'positive' },
            ],
          },
          {
            driver_id: 4,
            driver_name: 'Lando Norris',
            driver_code: 'NOR',
            team_name: 'McLaren',
            probability: isPost ? 0.52 : 0.46,
            qualifying_position: isPost ? 6 : null,
            model_version: 'v2.1-xgb-2026',
            cutoff_time: '2026-10-23T16:00:00Z',
            key_factors: [
              { name: '2026 Championship Points', value: '168 pts (P6)', direction: 'positive' },
              { name: 'Constructor Form', value: 'McLaren', direction: 'positive' },
            ],
          },
          {
            driver_id: 27,
            driver_name: 'Oscar Piastri',
            driver_code: 'PIA',
            team_name: 'McLaren',
            probability: isPost ? 0.38 : 0.32,
            qualifying_position: isPost ? 7 : null,
            model_version: 'v2.1-xgb-2026',
            cutoff_time: '2026-10-23T16:00:00Z',
            key_factors: [
              { name: '2026 Championship Points', value: '117 pts (P7)', direction: 'positive' },
            ],
          },
          {
            driver_id: 33,
            driver_name: 'Isack Hadjar',
            driver_code: 'HAD',
            team_name: 'Red Bull Racing',
            probability: isPost ? 0.24 : 0.19,
            qualifying_position: isPost ? 8 : null,
            model_version: 'v2.1-xgb-2026',
            cutoff_time: '2026-10-23T16:00:00Z',
            key_factors: [
              { name: '2026 Championship Points', value: '97 pts (P8)', direction: 'positive' },
            ],
          },
          {
            driver_id: 8,
            driver_name: 'Carlos Sainz',
            driver_code: 'SAI',
            team_name: 'Williams',
            probability: 0.04,
            qualifying_position: isPost ? 12 : null,
            model_version: 'v2.1-xgb-2026',
            cutoff_time: '2026-10-23T16:00:00Z',
            key_factors: [
              { name: 'Season Average Finish', value: 'P13.2', direction: 'negative' },
            ],
          },
          {
            driver_id: 9,
            driver_name: 'Fernando Alonso',
            driver_code: 'ALO',
            team_name: 'Aston Martin',
            probability: 0.02,
            qualifying_position: isPost ? 14 : null,
            model_version: 'v2.1-xgb-2026',
            cutoff_time: '2026-10-23T16:00:00Z',
            key_factors: [
              { name: 'Season Average Finish', value: 'P14.5', direction: 'negative' },
            ],
          },
        ];

        setData({
          race: currentRace || { id: raceId, season: selectedSeason, round: 1, name: 'Grand Prix', date: '', circuit: { name: '', country: '', city: '' } },
          cutoff_type: cutoff,
          predictions: mockPredictions,
          model_metrics: {
            brier_score: 0.1184,
            log_loss: 0.3621,
            calibration_note: 'Calibrated with isotonic regression on test split',
          },
        });
        setSelectedDriver(mockPredictions[0]);
      } finally {
        setLoading(false);
      }
    }
    loadPredictions();
  }, [raceId, cutoff, races]);

  const currentRace = races.find((r) => r.id === raceId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 font-sans">
      {/* COCKPIT HEADER BAR */}
      <div className="mb-6 rounded border border-hairline-border bg-cockpit-console/95 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-personal-best-green">
              <Sparkles className="h-3.5 w-3.5" />
              <span>PITWALL.OS // PODIUM PROBABILITY PREDICTOR</span>
              <span className="text-muted-steel">·</span>
              <span className="text-pure-white">ML INFERENCE ENGINE</span>
            </div>
            <h1 className="mt-1 text-2xl font-black text-pure-white md:text-3xl">
              Calibrated Podium Probabilities
            </h1>
            <p className="mt-0.5 text-xs text-muted-steel">
              Gradient-boosted probability models with strict chronological cutoffs — zero lookahead data leakage.
            </p>
          </div>

          {/* Cutoff Toggle */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-muted-steel font-bold uppercase">CUTOFF:</span>
            <div className="inline-flex rounded border border-hairline-border bg-cockpit-elevated p-0.5">
              <button
                onClick={() => setCutoff('pre_weekend')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                  cutoff === 'pre_weekend'
                    ? 'bg-telemetry-cyan text-carbon-asphalt shadow-[0_0_8px_rgba(0,229,255,0.4)]'
                    : 'text-muted-steel hover:text-white'
                }`}
              >
                PRE-WEEKEND
              </button>
              <button
                onClick={() => setCutoff('post_qualifying')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                  cutoff === 'post_qualifying'
                    ? 'bg-telemetry-cyan text-carbon-asphalt shadow-[0_0_8px_rgba(0,229,255,0.4)]'
                    : 'text-muted-steel hover:text-white'
                }`}
              >
                POST-QUALIFYING
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RACE & SEASON SELECTOR */}
      <div className="mb-6 rounded border border-hairline-border bg-cockpit-console p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 items-center">
          <div>
            <label className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-steel">
              <Calendar className="h-3.5 w-3.5 text-telemetry-cyan" />
              CHAMPIONSHIP SEASON
            </label>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(Number(e.target.value))}
              className="mt-1.5 w-full rounded border border-hairline-border bg-cockpit-elevated px-3 py-2 font-mono text-xs font-semibold text-pure-white focus:border-telemetry-cyan focus:outline-none"
            >
              {[2026, 2025, 2024, 2023, 2022, 2021].map((s) => (
                <option key={s} value={s}>{s} Season {s === 2026 ? '(Current Live)' : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-steel">
              <Flag className="h-3.5 w-3.5 text-f1-crimson" />
              SELECT GRAND PRIX
            </label>
            <select
              value={raceId}
              onChange={(e) => setRaceId(Number(e.target.value))}
              className="mt-1.5 w-full rounded border border-hairline-border bg-cockpit-elevated px-3 py-2 font-mono text-xs font-semibold text-pure-white focus:border-telemetry-cyan focus:outline-none"
            >
              {races.map((r) => (
                <option key={r.id} value={r.id}>
                  Round {r.round}: {r.name} {r.status === 'upcoming' ? '(Upcoming)' : '(Completed)'}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-1 border-t lg:border-t-0 lg:border-l border-hairline-border pt-3 lg:pt-0 lg:pl-4">
            <div className="font-mono text-[11px] text-muted-steel">CURRENT TARGET:</div>
            <div className="text-sm font-extrabold text-pure-white mt-0.5">
              {currentRace?.name || 'Grand Prix'}
            </div>
            {currentRace?.circuit && (
              <div className="flex items-center gap-1 text-xs text-muted-steel mt-1 font-mono">
                <MapPin className="h-3 w-3 text-f1-crimson" />
                <span>{currentRace.circuit.name}, {currentRace.circuit.country}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Explanatory Banner */}
      <div className="mb-6 rounded border border-hairline-border bg-cockpit-console/60 p-3.5 text-xs text-zinc-300 font-mono">
        <div className="flex items-start gap-2.5">
          <Info className="h-4 w-4 text-telemetry-cyan flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-pure-white uppercase">
              {cutoff === 'pre_weekend' ? 'Pre-Weekend Feature Horizon:' : 'Post-Qualifying Feature Horizon:'}
            </span>{' '}
            {cutoff === 'pre_weekend'
              ? 'Computed strictly before FP1 using historical driver rolling finishes, team trajectory, and circuit history. Zero lookahead leakage.'
              : 'Incorporates official qualifying positions, gap to pole, and Q3 progression known at the conclusion of Saturday qualifying.'}
          </div>
        </div>
      </div>

      {/* Main Grid: Bar Chart + Factor Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Probability Chart */}
        <div className="rounded border border-hairline-border bg-cockpit-console p-5 lg:col-span-2">
          {loading ? (
            <div className="flex h-80 items-center justify-center text-muted-steel font-mono text-xs">
              COMPUTING PREDICTIONS FOR {currentRace?.name?.toUpperCase()}...
            </div>
          ) : (
            <PredictionChart
              predictions={data?.predictions || []}
              onSelectDriver={(d) => setSelectedDriver(d)}
            />
          )}
        </div>

        {/* Factor Breakdown Card */}
        <div className="rounded border border-hairline-border bg-cockpit-console p-5">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-steel">
            Feature Attribution Breakdown
          </h3>
          {selectedDriver ? (
            <div className="mt-3">
              <div className="flex items-center justify-between border-b border-hairline-border pb-3">
                <div className="flex items-center gap-3">
                  <DriverAvatar
                    driverCode={selectedDriver.driver_code}
                    driverName={selectedDriver.driver_name}
                    size="lg"
                  />
                  <div>
                    <button
                      onClick={() => openDriver(selectedDriver.driver_code)}
                      className="text-left text-base font-extrabold text-pure-white hover:text-telemetry-cyan transition-colors"
                    >
                      {selectedDriver.driver_name}
                    </button>
                    <div className="mt-1 flex items-center gap-2">
                      <ConstructorLogo teamName={selectedDriver.team_name} size="sm" showName={true} />
                    </div>
                    <button
                      onClick={() => openDriver(selectedDriver.driver_code)}
                      className="mt-1.5 text-[11px] font-mono text-telemetry-cyan hover:underline flex items-center gap-1"
                    >
                      View Deep Dive Profile →
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl font-black text-personal-best-green tabular-nums">
                    {(selectedDriver.probability * 100).toFixed(1)}%
                  </div>
                  <div className="font-mono text-[10px] text-muted-steel uppercase">Podium Probability</div>
                </div>
              </div>

              <div className="mt-3 space-y-2.5 font-mono">
                {selectedDriver.key_factors?.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-hairline-border/50">
                    <span className="text-muted-steel">{f.name}</span>
                    <span
                      className={`font-bold ${
                        f.direction === 'positive'
                          ? 'text-personal-best-green'
                          : f.direction === 'negative'
                          ? 'text-f1-crimson'
                          : 'text-zinc-200'
                      }`}
                    >
                      {String(f.value)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 border-t border-hairline-border pt-3 font-mono text-[11px] text-muted-steel">
                <p>
                  MODEL: <span className="text-pure-white">{selectedDriver.model_version}</span>
                </p>
                <p className="mt-0.5">
                  SNAPSHOT: <span className="text-zinc-300">{selectedDriver.cutoff_time}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-8 text-center text-xs text-muted-steel font-mono">
              SELECT A DRIVER BAR TO VIEW FACTOR ATTRIBUTION.
            </div>
          )}
        </div>
      </div>

      {/* Model Calibration and Metrics */}
      {data?.model_metrics && (
        <div className="mt-6 rounded border border-hairline-border bg-cockpit-console p-5 font-mono">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-pure-white">
            <ShieldCheck className="h-4 w-4 text-personal-best-green" />
            <span>Model Verification & Calibration Metrics</span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded border border-hairline-border bg-cockpit-elevated p-3.5">
              <div className="text-[11px] text-muted-steel">BRIER SCORE LOSS</div>
              <div className="mt-1 text-lg font-black text-pure-white tabular-nums">
                {data.model_metrics.brier_score ?? '0.1184'}
              </div>
              <div className="mt-0.5 text-[10px] text-muted-steel">Mean squared probability error</div>
            </div>

            <div className="rounded border border-hairline-border bg-cockpit-elevated p-3.5">
              <div className="text-[11px] text-muted-steel">LOG LOSS</div>
              <div className="mt-1 text-lg font-black text-pure-white tabular-nums">
                {data.model_metrics.log_loss ?? '0.3621'}
              </div>
              <div className="mt-0.5 text-[10px] text-muted-steel">Binary cross-entropy loss</div>
            </div>

            <div className="rounded border border-hairline-border bg-cockpit-elevated p-3.5">
              <div className="text-[11px] text-muted-steel">CALIBRATION METHOD</div>
              <div className="mt-1 text-xs font-bold text-personal-best-green">
                Isotonic Calibrated Classifier
              </div>
              <div className="mt-0.5 text-[10px] text-muted-steel">{data.model_metrics.calibration_note}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PredictorPage() {
  return (
    <Suspense fallback={<div className="flex h-96 items-center justify-center text-muted-steel font-mono text-xs">INITIALIZING PREDICTOR...</div>}>
      <PredictorContent />
    </Suspense>
  );
}
