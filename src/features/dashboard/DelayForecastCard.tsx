'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus, AlertCircle, BarChart2 } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { DelayForecast } from '@/services/delayForecastService';

// ─── Confidence config ────────────────────────────────────────────────────────

const CONFIDENCE_CONFIG = {
  high: {
    label: 'High Confidence',
    barWidth: 'w-full',
    barColor: 'bg-emerald-400',
    textColor: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    dotColor: 'bg-emerald-400',
  },
  medium: {
    label: 'Medium Confidence',
    barWidth: 'w-2/3',
    barColor: 'bg-amber-400',
    textColor: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    dotColor: 'bg-amber-400',
  },
  low: {
    label: 'Low Confidence',
    barWidth: 'w-1/3',
    barColor: 'bg-slate-300',
    textColor: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    dotColor: 'bg-slate-400',
  },
  none: {
    label: 'Insufficient Data',
    barWidth: 'w-0',
    barColor: 'bg-slate-200',
    textColor: 'text-slate-500',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    dotColor: 'bg-slate-300',
  },
} as const;

// ─── Trend config ─────────────────────────────────────────────────────────────

const TREND_CONFIG = {
  growing: {
    icon: TrendingUp,
    label: 'Growing',
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  recovering: {
    icon: TrendingDown,
    label: 'Recovering',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  stable: {
    icon: Minus,
    label: 'Stable',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
} as const;

// ─── Props ────────────────────────────────────────────────────────────────────

interface DelayForecastCardProps {
  forecast: DelayForecast | null | undefined;
  isLoading?: boolean;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonBar({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-full bg-slate-100 animate-pulse ${className}`} />
  );
}

function DelayNumber({
  minutes,
  label,
  dim = false,
}: {
  minutes: number | null;
  label: string;
  dim?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <span
        className={`text-3xl font-extrabold tracking-tight ${
          minutes === null
            ? 'text-slate-300'
            : minutes === 0
            ? 'text-emerald-600'
            : minutes <= 5
            ? 'text-amber-500'
            : 'text-red-500'
        } ${dim ? 'opacity-50' : ''}`}
      >
        {minutes === null ? '--' : `+${minutes}`}
      </span>
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
        {label}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DelayForecastCard({ forecast, isLoading }: DelayForecastCardProps) {

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-purple-50 border border-purple-100">
            <BarChart2 className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <SkeletonBar className="h-3.5 w-32 mb-1" />
            <SkeletonBar className="h-2.5 w-20" />
          </div>
        </div>
        <div className="flex items-center gap-6 mb-4">
          <SkeletonBar className="h-10 w-14" />
          <SkeletonBar className="h-6 w-6 rounded-full" />
          <SkeletonBar className="h-10 w-14" />
        </div>
        <SkeletonBar className="h-2 w-full mb-3" />
        <SkeletonBar className="h-8 w-full" />
      </GlassCard>
    );
  }

  // ── No data / cold-start ──────────────────────────────────────────────────
  if (!forecast || forecast.confidence === 'none') {
    const basisText =
      forecast?.basis ||
      'Observations accumulate automatically as the train is polled every 30 s.';

    return (
      <GlassCard className="border-slate-200">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-purple-50 border border-purple-100 shrink-0">
            <BarChart2 className="w-5 h-5 text-purple-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Delay Forecast
              </p>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-slate-50 text-slate-500 border-slate-200">
                Insufficient Data
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-800 mt-1">
              Not enough historical data yet
            </h3>
            <div className="mt-2 flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500 leading-relaxed">{basisText}</p>
            </div>
          </div>
        </div>
      </GlassCard>
    );
  }

  // ── Normal prediction state ───────────────────────────────────────────────
  const conf = CONFIDENCE_CONFIG[forecast.confidence];
  const trend = TREND_CONFIG[forecast.trendDirection];
  const TrendIcon = trend.icon;

  // How much did the delay change from current → projected?
  const delta =
    forecast.projectedDelay !== null
      ? forecast.projectedDelay - forecast.currentDelay
      : null;

  return (
    <GlassCard className={`border ${conf.borderColor}`}>
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-50 border border-purple-100">
            <BarChart2 className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Delay Forecast
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">{forecast.basis}</p>
          </div>
        </div>

        {/* Trend badge */}
        <span
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${trend.color} ${trend.bgColor} ${trend.borderColor}`}
        >
          <TrendIcon className="w-3 h-3" />
          {trend.label}
        </span>
      </div>

      {/* ── Current → Projected delay ── */}
      <div className="flex items-center gap-4 mb-5">
        <DelayNumber minutes={forecast.currentDelay} label="Now (min)" />

        {/* Arrow */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="relative w-full h-px bg-slate-200">
            <div
              className={`absolute inset-y-0 left-0 h-px ${
                forecast.trendDirection === 'growing'
                  ? 'bg-red-400'
                  : forecast.trendDirection === 'recovering'
                  ? 'bg-emerald-400'
                  : 'bg-blue-300'
              }`}
              style={{ width: '100%' }}
            />
            {/* Delta chip */}
            {delta !== null && (
              <span
                className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                  delta > 0
                    ? 'bg-red-50 text-red-500 border border-red-200'
                    : delta < 0
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}
              >
                {delta > 0 ? `+${delta} min` : delta < 0 ? `${delta} min` : 'no change'}
              </span>
            )}
          </div>
          <span className="text-[9px] text-slate-400 font-medium tracking-wide uppercase">
            {forecast.remainingStations} stations ahead
          </span>
        </div>

        <DelayNumber
          minutes={forecast.projectedDelay}
          label="At Dest (min)"
          dim={forecast.projectedDelay === null}
        />
      </div>

      {/* ── Confidence bar ── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Confidence
          </span>
          <span className={`text-[11px] font-bold ${conf.textColor}`}>{conf.label}</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${conf.barColor} ${conf.barWidth}`}
          />
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          Based on {forecast.totalObservations} total observation
          {forecast.totalObservations !== 1 ? 's' : ''} ·{' '}
          {forecast.recentObservations} in last 6 h
        </p>
      </div>

      {/* ── Plain-English trend note ── */}
      <div className={`flex items-start gap-2 p-3 rounded-xl border ${trend.bgColor} ${trend.borderColor}`}>
        <TrendIcon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${trend.color}`} />
        <p className="text-xs text-slate-700 leading-relaxed">{forecast.trendNote}</p>
      </div>

      {/* ── Slope footnote (for transparency / interview explainability) ── */}
      <p className="mt-3 text-[10px] text-slate-400">
        Trend slope: {forecast.trendSlopePerStation >= 0 ? '+' : ''}
        {forecast.trendSlopePerStation.toFixed(2)} min/station (OLS linear regression, last {forecast.recentObservations} stops)
      </p>
    </GlassCard>
  );
}
