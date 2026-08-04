'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { LiveStatus, ElevationPoint, Station } from '@/types';
import GlassCard from '@/components/ui/GlassCard';
import MetricCard from '@/components/ui/MetricCard';
import { Gauge, Mountain, Clock, MapPin, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatKm } from '@/utils';

interface AnalyticsViewProps {
  liveStatus: LiveStatus;
  elevationData: ElevationPoint[];
  stations: Station[];
}

export default function AnalyticsView({ liveStatus, elevationData, stations }: AnalyticsViewProps) {
  // Build chart data for delay trend
  const delayChartData = stations.map((s) => ({
    station: s.code,
    delay: s.delayMinutes,
    name: s.name,
  }));

  const maxElevation = Math.max(...elevationData.map((e) => e.elevationMeters), 200);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          icon={<Gauge className="w-5 h-5" />}
          label="Progress"
          value={`${liveStatus.progressPercentage}%`}
          subtext={`${liveStatus.distanceCoveredKm} / ${liveStatus.distanceCoveredKm + liveStatus.remainingDistanceKm} km`}
          badge="Live Track"
          badgeType="success"
        />
        <MetricCard
          icon={<Clock className="w-5 h-5" />}
          label="Current Delay"
          value={liveStatus.delayMinutes === 0 ? 'On Time' : `${liveStatus.delayMinutes} min`}
          subtext={`ETA: ${liveStatus.etaDestination}`}
          badge={liveStatus.delayMinutes <= 5 ? 'Smooth' : 'Delayed'}
          badgeType={liveStatus.delayMinutes <= 5 ? 'success' : 'warning'}
        />
        <MetricCard
          icon={<Mountain className="w-5 h-5" />}
          label="Highest Elevation"
          value={`${maxElevation} m`}
          subtext="Above Sea Level"
          badge="Topography"
        />
        <MetricCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Current Speed"
          value={`${liveStatus.currentLocation.speedKmh} km/h`}
          subtext="GPS Speedometer"
          badge="High Speed"
          badgeType="success"
        />
      </div>

      {/* Elevation Profile Chart */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Mountain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Terrain & Elevation Profile</h3>
              <p className="text-xs text-slate-500">Route elevation (meters above sea level)</p>
            </div>
          </div>
          <span className="px-2.5 py-1 text-xs font-semibold bg-purple-100 text-purple-700 rounded-lg">
            Peak: {maxElevation}m
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={elevationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="elevationGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="distanceKm" tick={{ fontSize: 11, fill: '#64748b' }} unit="km" />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="m" />
              <Tooltip
                contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                formatter={(value: any) => [`${value} meters`, 'Elevation']}
                labelFormatter={(label: any) => `Distance: ${label} km`}
              />
              <Area type="monotone" dataKey="elevationMeters" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#elevationGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Delay Trend Chart */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Station Delay Pattern</h3>
              <p className="text-xs text-slate-500">Delay minutes at each station along route</p>
            </div>
          </div>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={delayChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="station" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="m" />
              <Tooltip
                contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                formatter={(value: any) => [`${value} min`, 'Delay']}
                labelFormatter={(label: any) => `Station: ${label}`}
              />
              <Line type="monotone" dataKey="delay" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5, fill: '#f59e0b' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Station Timeline */}
      <GlassCard>
        <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" /> Station Timeline & Arrival History
        </h3>

        <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
          {stations.map((st, idx) => {
            const isPassed = st.status === 'passed';
            const isCurrent = st.status === 'current';
            return (
              <div key={st.id} className="relative group">
                {/* Status Dot */}
                <div
                  className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-md flex items-center justify-center ${
                    isCurrent
                      ? 'bg-blue-600 ring-4 ring-blue-100 scale-125'
                      : isPassed
                      ? 'bg-emerald-500'
                      : 'bg-slate-300'
                  }`}
                >
                  {isPassed && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{st.name}</span>
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-600 rounded">
                        {st.code}
                      </span>
                      {isCurrent && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full animate-pulse">
                          Current Location
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Distance: {st.distanceFromStartKm} km | Elev: {st.elevationMeters}m | Pf #{st.platform || '1'}
                    </p>
                  </div>

                  <div className="mt-2 sm:mt-0 text-left sm:text-right">
                    <p className="text-xs font-semibold text-slate-900">
                      Sch: {st.scheduledArrival} | Act: {st.actualArrival || st.scheduledArrival}
                    </p>
                    <span
                      className={`inline-block text-[11px] font-bold mt-0.5 ${
                        st.delayMinutes <= 0 ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {st.delayMinutes <= 0 ? 'On Time' : `+${st.delayMinutes} min delay`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
