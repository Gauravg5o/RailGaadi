'use client';

import React from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import GlassCard from '@/components/ui/GlassCard';
import { usePreferencesStore } from '@/store/preferencesStore';
import { Heart, Trash2, ChevronRight, TrainTrack } from 'lucide-react';

export default function FavouritesPage() {
  const { favourites, toggleFavourite } = usePreferencesStore();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 md:pb-8">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Heart className="w-6 h-6 text-rose-500 fill-rose-500" /> Saved Favourites
            </h1>
            <p className="text-xs text-slate-500 mt-1">Quick access to your saved train routes</p>
          </div>
          <span className="px-3 py-1 bg-slate-200/80 text-slate-700 font-bold text-xs rounded-full">
            {favourites.length} Saved
          </span>
        </div>

        {favourites.length === 0 ? (
          <GlassCard className="p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
              <Heart className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No Favourites Saved Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click the heart icon on any train dashboard to save your frequent journeys here for 1-click access.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors"
            >
              Search Trains
            </Link>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {favourites.map((fav) => (
              <GlassCard key={fav.trainNumber} hoverable className="relative group p-5 border border-slate-200">
                <div className="flex items-start justify-between">
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 font-mono font-bold text-xs rounded-xl border border-blue-100">
                    {fav.trainNumber}
                  </span>

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      toggleFavourite(fav);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <Link href={`/train/${fav.trainNumber}`}>
                  <h3 className="font-bold text-slate-900 text-base mt-3 group-hover:text-blue-600 transition-colors">
                    {fav.trainName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    {fav.source} → {fav.destination}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
                    <span>Track Live Journey</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Link>
              </GlassCard>
            ))}
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
