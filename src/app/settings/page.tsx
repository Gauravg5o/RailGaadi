'use client';

import React from 'react';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import GlassCard from '@/components/ui/GlassCard';
import { usePreferencesStore } from '@/store/preferencesStore';
import { Settings, RefreshCw, Trash2, Sliders, Map, Eye } from 'lucide-react';

export default function SettingsPage() {
  const {
    autoRefreshIntervalSeconds,
    setAutoRefreshInterval,
    reduceAnimations,
    setReduceAnimations,
    clearRecentSearches,
    mapStyle,
    setMapStyle,
  } = usePreferencesStore();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 md:pb-8">
      <Header />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" /> Platform Preferences
          </h1>
          <p className="text-xs text-slate-500 mt-1">Customize live updates, map display, and performance</p>
        </div>

        {/* Auto Refresh Setting */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Auto Refresh Frequency</h3>
              <p className="text-xs text-slate-500">Frequency for refetching live GPS train position</p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            {[15, 30, 60].map((interval) => (
              <button
                key={interval}
                onClick={() => setAutoRefreshInterval(interval)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  autoRefreshIntervalSeconds === interval
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Every {interval}s
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Animations & Visual Preference */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Reduce Motion & Animations</h3>
                <p className="text-xs text-slate-500">Turn off spring card animations and transitions</p>
              </div>
            </div>

            <button
              onClick={() => setReduceAnimations(!reduceAnimations)}
              className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                reduceAnimations ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  reduceAnimations ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </GlassCard>

        {/* Clear Data */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Clear Recent Searches</h3>
                <p className="text-xs text-slate-500">Remove saved search history from local storage</p>
              </div>
            </div>

            <button
              onClick={clearRecentSearches}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold border border-rose-200 transition-colors"
            >
              Clear History
            </button>
          </div>
        </GlassCard>
      </main>

      <BottomNavigation />
    </div>
  );
}
