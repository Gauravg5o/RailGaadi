'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SearchBar from '@/features/search/SearchBar';
import GlassCard from '@/components/ui/GlassCard';
import { POPULAR_TRAINS_LIST } from '@/services/trainService';
import {
  TrainTrack,
  Sparkles,
  Navigation,
  ChevronRight,
  Zap,
  ShieldCheck,
  Radio,
  Clock,
  CloudSun,
  ArrowRight,
  Gauge,
  MapPin,
  Activity,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';

const FEATURED_TRAINS = POPULAR_TRAINS_LIST.slice(0, 4);

const QUICK_CHIPS = [
  { number: '12951', name: 'Mumbai Rajdhani' },
  { number: '22436', name: 'Vande Bharat' },
  { number: '12002', name: 'Bhopal Shatabdi' },
  { number: '12301', name: 'Howrah Rajdhani' },
  { number: '12050', name: 'Gatimaan' },
  { number: '12626', name: 'Kerala Express' },
];

const STATS = [
  { label: 'Trains Tracked', value: '13,000+', icon: TrainTrack },
  { label: 'Stations Covered', value: '7,000+', icon: MapPin },
  { label: 'Live Updates', value: 'Every 30s', icon: Radio },
  { label: 'Route Length', value: '67,000 km', icon: Gauge },
];

const FEATURE_CARDS = [
  {
    icon: Navigation,
    color: 'blue',
    title: 'Interactive Vector Maps',
    desc: 'Real-time map animations powered by MapLibre GL, with smooth marker interpolation and live camera follow mode.',
  },
  {
    icon: Activity,
    color: 'purple',
    title: 'Journey Analytics & Elevation',
    desc: 'Visualize elevation profile charts, station delay trends, and precise progress metrics along your route.',
  },
  {
    icon: CloudSun,
    color: 'emerald',
    title: 'Weather & Geo Intelligence',
    desc: 'Live weather forecasts at each station and nearby geographic insights — rivers, bridges, tunnels, and landmarks.',
  },
];

const TYPE_BADGE_COLORS: Record<string, string> = {
  'Rajdhani': 'bg-rose-50 text-rose-700 border-rose-200',
  'Vande Bharat': 'bg-blue-50 text-blue-700 border-blue-200',
  'Shatabdi': 'bg-purple-50 text-purple-700 border-purple-200',
  'Express': 'bg-slate-100 text-slate-700 border-slate-200',
};

function getTrainType(name: string): string {
  if (name.includes('Rajdhani')) return 'Rajdhani';
  if (name.includes('Vande Bharat')) return 'Vande Bharat';
  if (name.includes('Shatabdi')) return 'Shatabdi';
  if (name.includes('Gatimaan')) return 'Gatimaan';
  if (name.includes('Duronto')) return 'Duronto';
  return 'Express';
}

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 md:pb-8">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-14">
        {/* ── Hero Section ────────────────────────────────────────────── */}
        <div className="text-center max-w-3xl mx-auto space-y-6 pt-8 sm:pt-12">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Next-Gen Train Intelligence Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
            Track Any Train in{' '}
            <span className="text-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Real Time
            </span>{' '}
            with Precision
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
            Live interactive route maps, terrain elevation profiles, weather updates, delay trends, and geographic
            insights for Indian Railways.
          </p>

          {/* Search Bar */}
          <div className="pt-2">
            <SearchBar />
          </div>

          {/* Quick Train Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="text-xs font-semibold text-slate-400">Popular Trains:</span>
            {QUICK_CHIPS.map((chip) => (
              <Link
                key={chip.number}
                href={`/train/${chip.number}`}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm hover:shadow"
              >
                <span className="font-mono font-bold text-blue-600 mr-1">{chip.number}</span> {chip.name}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Stats Bar ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s) => {
            const Icon = s.icon;
            return (
              <GlassCard key={s.label} className="flex items-center gap-4 p-5 border border-slate-200/80">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xl font-black text-slate-900 leading-tight">{s.value}</p>
                  <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                </div>
              </GlassCard>
            );
          })}
        </div>

        {/* ── Featured Trains Grid ─────────────────────────────────────── */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Featured Express Trains</h2>
              <p className="text-sm text-slate-500 mt-1">Live GPS tracking active for major corridors</p>
            </div>
            <Link
              href="/train/12951"
              className="hidden sm:flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURED_TRAINS.map((train) => {
              const type = getTrainType(train.name);
              const badgeClass = TYPE_BADGE_COLORS[type] || TYPE_BADGE_COLORS['Express'];
              return (
                <Link key={train.number} href={`/train/${train.number}`}>
                  <GlassCard
                    hoverable
                    className="h-full flex flex-col justify-between p-5 border border-slate-200 group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 font-mono font-bold text-xs border border-blue-100">
                          {train.number}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${badgeClass}`}
                        >
                          {type}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-base leading-snug">{train.name}</h3>
                      <p className="text-xs text-slate-500 mt-1.5 font-medium flex items-center gap-1.5">
                        <span>{train.source}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span>{train.destination}</span>
                      </p>
                    </div>

                    {/* Live indicator dot */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        Live Tracking
                      </span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </GlassCard>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Platform Features ────────────────────────────────────────── */}
        <div className="space-y-5 pb-6">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight text-center">
            Built for Indian Railways
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURE_CARDS.map((f) => {
              const Icon = f.icon;
              const colorMap: Record<string, string> = {
                blue: 'bg-blue-50 text-blue-600',
                purple: 'bg-purple-50 text-purple-600',
                emerald: 'bg-emerald-50 text-emerald-600',
              };
              return (
                <GlassCard key={f.title} className="p-7 border border-slate-200/80 hover:border-blue-200 transition-colors">
                  <div className={`p-3 ${colorMap[f.color]} rounded-2xl w-fit`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg mt-4">{f.title}</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">{f.desc}</p>
                </GlassCard>
              );
            })}
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
