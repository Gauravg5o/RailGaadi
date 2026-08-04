'use client';

import React from 'react';
import { GeoPOI } from '@/types';
import GlassCard from '@/components/ui/GlassCard';
import { Compass, Waves, Landmark, Eye, Navigation, Mountain } from 'lucide-react';

interface GeographyPanelProps {
  pois: GeoPOI[];
  currentStationName: string;
}

export default function GeographyPanel({ pois, currentStationName }: GeographyPanelProps) {
  const getCategoryIcon = (type: GeoPOI['type']) => {
    switch (type) {
      case 'river':
      case 'lake':
        return <Waves className="w-5 h-5 text-blue-600" />;
      case 'bridge':
      case 'tunnel':
        return <Navigation className="w-5 h-5 text-indigo-600" />;
      case 'ghat':
        return <Mountain className="w-5 h-5 text-emerald-600" />;
      case 'attraction':
        return <Landmark className="w-5 h-5 text-amber-600" />;
      default:
        return <Eye className="w-5 h-5 text-purple-600" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <GlassCard className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Smart Travel Companion</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Geographic landmarks, rivers, bridges & heritage sites around {currentStationName}
            </p>
          </div>
        </div>
      </GlassCard>

      {pois.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 space-y-3">
          <Compass className="w-14 h-14 opacity-30" />
          <p className="font-semibold text-slate-600">No geographic landmarks found</p>
          <p className="text-sm max-w-sm">
            Geographic points of interest around <strong>{currentStationName}</strong> will appear here when data is
            available from the OpenTopography API.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pois.map((poi) => (
            <GlassCard key={poi.id} hoverable className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200">
                    {getCategoryIcon(poi.type)}
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                    {poi.distanceKm} km away
                  </span>
                </div>

                <h4 className="font-bold text-slate-900 text-base mt-3">{poi.name}</h4>
                {poi.description && (
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{poi.description}</p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span className="capitalize font-medium text-slate-600">Category: {poi.type}</span>
                <span className="font-mono">
                  {poi.lat.toFixed(4)}, {poi.lng.toFixed(4)}
                </span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
