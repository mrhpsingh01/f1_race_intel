'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { DriverPrediction } from '@/lib/api';
import { DriverAvatar, ConstructorLogo } from '@/components/common/ConstructorLogo';

interface PredictionChartProps {
  predictions: DriverPrediction[];
  onSelectDriver?: (driver: DriverPrediction) => void;
}

export default function PredictionChart({
  predictions,
  onSelectDriver,
}: PredictionChartProps) {
  if (!predictions || predictions.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-steel font-mono text-xs">
        NO PREDICTIONS GENERATED FOR THIS CUTOFF
      </div>
    );
  }

  // Display top 10 contenders with unique rank labels
  const data = predictions.slice(0, 10).map((p, idx) => {
    const code = p.driver_code || p.driver_name.slice(0, 3).toUpperCase();
    const prob = Math.round(p.probability * 1000) / 10;
    return {
      rank: idx + 1,
      displayName: `P${idx + 1} ${code}`,
      driverCode: code,
      driverName: p.driver_name,
      team: p.team_name,
      probability: prob,
      probText: `${prob.toFixed(1)}%`,
      raw: p,
    };
  });

  const getBarColor = (prob: number) => {
    if (prob >= 50) return '#00E676'; // Personal Best Green (>50%)
    if (prob >= 30) return '#00E5FF'; // Telemetry Cyan (30-50%)
    if (prob >= 15) return '#FFB800'; // Telemetry Amber (15-30%)
    return '#64748B'; // Muted Steel (<15%)
  };

  return (
    <div className="w-full font-sans">
      {/* Top 5 Contenders Cards Gallery with Real Photos & Car Brand Logos */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between text-xs font-mono text-muted-steel">
          <span>PROJECTED PODIUM CONTENDERS (SELECT TO INSPECT FACTORS)</span>
          <span className="text-[11px] text-telemetry-cyan font-bold">2026 RACE HORIZON</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {data.slice(0, 5).map((item) => (
            <button
              key={item.driverCode}
              type="button"
              onClick={() => onSelectDriver && onSelectDriver(item.raw)}
              className="flex flex-col items-center rounded-lg border border-hairline-border bg-cockpit-elevated p-2.5 text-center transition-all duration-200 hover:border-telemetry-cyan hover:bg-cockpit-panel hover:scale-[1.02] group text-left"
            >
              <div className="relative mb-2">
                <DriverAvatar
                  driverCode={item.driverCode}
                  driverName={item.driverName}
                  size="md"
                />
                <span
                  className="absolute -top-1 -left-1 font-mono text-[9px] font-black px-1 rounded bg-black/80 text-pure-white border border-zinc-700"
                >
                  P{item.rank}
                </span>
              </div>
              <div className="w-full text-center">
                <span className="text-xs font-bold text-pure-white truncate block">
                  {item.driverName.split(' ').pop()}
                </span>
                <div className="mt-1 flex items-center justify-center">
                  <ConstructorLogo
                    teamName={item.team}
                    size="sm"
                    showName={false}
                  />
                </div>
                <div className="mt-1.5 font-mono text-xs font-black text-personal-best-green">
                  {item.probText}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between text-xs font-mono text-muted-steel">
        <span>PROBABILITY DISTRIBUTION (P1 → P10)</span>
        <span className="text-[11px] text-zinc-500">CLICK BAR TO INSPECT</span>
      </div>

      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 65, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1E232D" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              unit="%"
              stroke="#64748B"
              tick={{ fontSize: 11, fontFamily: 'monospace' }}
            />
            <YAxis
              dataKey="displayName"
              type="category"
              stroke="#F8FAFC"
              width={75}
              interval={0}
              tick={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#11141A', borderColor: 'rgba(255,255,255,0.1)', fontSize: '12px', fontFamily: 'monospace' }}
              formatter={(val: any, name: string, item: any) => [
                `${val}% podium probability (${item.payload.team})`,
                `#${item.payload.rank} · ${item.payload.driverName}`,
              ]}
            />
            <Bar
              dataKey="probability"
              barSize={18}
              radius={[0, 2, 2, 0]}
              onClick={(entry) => onSelectDriver && onSelectDriver(entry.raw)}
              className="cursor-pointer"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.probability)} />
              ))}
              <LabelList
                dataKey="probText"
                position="right"
                fill="#F8FAFC"
                fontSize={11}
                fontWeight={700}
                fontFamily="monospace"
                offset={8}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
