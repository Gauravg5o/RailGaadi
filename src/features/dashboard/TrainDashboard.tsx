'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTrainByNumber, getLiveStatus } from '@/services/trainService';
import { getWeatherForStation } from '@/services/weatherService';
import { getNearbyGeography } from '@/services/geographyService';
import { getElevationProfile } from '@/services/elevationService';
import { useUIStore } from '@/store/uiStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import dynamic from 'next/dynamic';
import StatusBadge from '@/components/ui/StatusBadge';
import GlassCard from '@/components/ui/GlassCard';
import MetricCard from '@/components/ui/MetricCard';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import ShareModal from '@/components/ui/ShareModal';
import { Station, Train } from '@/types';

const AnalyticsView = dynamic(() => import('@/features/analytics/AnalyticsView'), {
  ssr: false,
  loading: () => <SkeletonLoader className="h-96 w-full" />,
});
import WeatherPanel from '@/features/weather/WeatherPanel';
import GeographyPanel from '@/features/geography/GeographyPanel';

const RouteMap = dynamic(() => import('@/features/map/RouteMap'), {
  ssr: false,
  loading: () => <SkeletonLoader className="h-[500px] w-full" />,
});

import {
  TrainTrack,
  Heart,
  Share2,
  RefreshCw,
  MapPin,
  Clock,
  Navigation,
  Gauge,
  Activity,
  CloudSun,
  Compass,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface TrainDashboardProps {
  trainNumber: string;
}

export default function TrainDashboard({ trainNumber }: TrainDashboardProps) {
  const { activeTab, setActiveTab, isShareModalOpen, setIsShareModalOpen } = useUIStore();
  const { toggleFavourite, isFavourite, autoRefreshIntervalSeconds } = usePreferencesStore();

  const [refreshSecondsLeft, setRefreshSecondsLeft] = useState(autoRefreshIntervalSeconds);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live Status Query (Auto Refreshed) - primary source of truth
  const {
    data: liveStatus,
    isLoading: isStatusLoading,
    refetch: refetchStatus,
    isError: statusError,
  } = useQuery({
    queryKey: ['liveStatus', trainNumber],
    queryFn: () => getLiveStatus(trainNumber),
    refetchInterval: autoRefreshIntervalSeconds * 1000,
    retry: 2,
  });

  // Train Info Query - used for supplementary info like type/days
  const { data: trainInfo } = useQuery({
    queryKey: ['train', trainNumber],
    queryFn: () => getTrainByNumber(trainNumber),
    staleTime: 5 * 60 * 1000, // 5 min
  });

  // Build a merged train object from status (which has route) or trainInfo
  const train: Train | null = useMemo(() => {
    if (liveStatus && liveStatus.route && liveStatus.route.stations && liveStatus.route.stations.length > 0) {
      return {
        id: trainNumber,
        number: trainNumber,
        name: liveStatus.trainName,
        type: trainInfo?.type || 'Express',
        source: liveStatus.route.source || trainInfo?.source || 'N/A',
        destination: liveStatus.route.destination || trainInfo?.destination || 'N/A',
        route: liveStatus.route,
      };
    }
    if (trainInfo) return trainInfo;
    // Fallback stub
    return {
      id: trainNumber,
      number: trainNumber,
      name: liveStatus?.trainName || `Train ${trainNumber}`,
      type: 'Express',
      source: liveStatus?.currentStation?.name || 'N/A',
      destination: liveStatus?.nextStation?.name || 'N/A',
      route: {
        source: liveStatus?.currentStation?.name || 'N/A',
        destination: liveStatus?.nextStation?.name || 'N/A',
        totalDistanceKm: liveStatus?.distanceCoveredKm
          ? liveStatus.distanceCoveredKm + (liveStatus.remainingDistanceKm || 0)
          : 0,
        totalDurationMinutes: 0,
        stations: liveStatus?.currentStation
          ? [
              ...(liveStatus.previousStation ? [{ ...liveStatus.previousStation, status: 'passed' as const }] : []),
              { ...liveStatus.currentStation, status: 'current' as const },
              ...(liveStatus.nextStation ? [{ ...liveStatus.nextStation, status: 'upcoming' as const }] : []),
            ]
          : [],
      },
    };
  }, [liveStatus, trainInfo, trainNumber]);

  // Weather Query
  const { data: currentWeather } = useQuery({
    queryKey: ['weather', liveStatus?.currentStation?.code],
    queryFn: () =>
      liveStatus?.currentStation
        ? getWeatherForStation(liveStatus.currentStation.code, liveStatus.currentStation.name)
        : null,
    enabled: !!liveStatus?.currentStation?.code && liveStatus.currentStation.code !== 'SRC',
  });

  const { data: destinationWeather } = useQuery({
    queryKey: ['weather', liveStatus?.nextStation?.code],
    queryFn: () =>
      liveStatus?.nextStation
        ? getWeatherForStation(liveStatus.nextStation.code, liveStatus.nextStation.name)
        : null,
    enabled:
      !!liveStatus?.nextStation?.code &&
      liveStatus.nextStation.code !== 'DST' &&
      liveStatus.nextStation.code !== liveStatus?.currentStation?.code,
  });

  // Geography Query
  const { data: geoPois } = useQuery({
    queryKey: ['geography', liveStatus?.currentStation?.code],
    queryFn: () =>
      liveStatus?.currentStation
        ? getNearbyGeography(
            liveStatus.currentStation.code,
            liveStatus.currentStation.name,
            liveStatus.currentStation.lat,
            liveStatus.currentStation.lng
          )
        : [],
    enabled: !!liveStatus?.currentStation?.code && liveStatus.currentStation.code !== 'SRC',
  });

  // Elevation Query
  const { data: elevationData } = useQuery({
    queryKey: ['elevation', trainNumber],
    queryFn: () => getElevationProfile(trainNumber, train?.route?.stations || []),
    enabled: !!train?.route?.stations?.length,
  });

  // Countdown Timer for Auto Refresh
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshSecondsLeft((prev) => {
        if (prev <= 1) return autoRefreshIntervalSeconds;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [autoRefreshIntervalSeconds]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refetchStatus();
    setRefreshSecondsLeft(autoRefreshIntervalSeconds);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const hasRealData = Boolean(
    liveStatus &&
    liveStatus.currentStation &&
    train?.route?.stations &&
    train.route.stations.length > 0
  );

  const stations: Station[] = liveStatus?.route?.stations && liveStatus.route.stations.length > 0
    ? liveStatus.route.stations
    : (train?.route?.stations || []);

  const totalDistanceKm =
    liveStatus?.route?.totalDistanceKm ||
    train?.route?.totalDistanceKm ||
    (liveStatus?.distanceCoveredKm || 0) + (liveStatus?.remainingDistanceKm || 0);

  if (isStatusLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-center h-40 gap-3 text-slate-500">
          <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
          <div>
            <p className="font-bold text-slate-900">Fetching Live Train Data…</p>
            <p className="text-sm">Connecting to Indian Railways live GPS feed</p>
          </div>
        </div>
        <SkeletonLoader className="h-28 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SkeletonLoader className="h-28" />
          <SkeletonLoader className="h-28" />
          <SkeletonLoader className="h-28" />
          <SkeletonLoader className="h-28" />
        </div>
        <SkeletonLoader className="h-96 w-full" />
      </div>
    );
  }

  if (!liveStatus) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Connecting to Real-Time GPS Feed…</h2>
        <p className="text-slate-500 text-xs max-w-md mx-auto">
          Synchronizing journey schedule for train <strong>{trainNumber}</strong> with Indian Railways servers.
        </p>
        <button
          onClick={handleManualRefresh}
          className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md"
        >
          Refresh GPS Stream
        </button>
      </div>
    );
  }

  const favourited = isFavourite(trainNumber);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header Card */}
      <GlassCard className="bg-white/95 p-6 shadow-xl border border-slate-200/90 rounded-3xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Train Title & Route */}
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-3 py-1 bg-blue-600 text-white font-mono font-bold text-sm rounded-xl shadow-md">
                {train.number}
              </span>
              <StatusBadge delayMinutes={liveStatus.delayMinutes} status={liveStatus.status} size="lg" />
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-600 rounded-md">
                {train.type}
              </span>
              {liveStatus.status === 'Not Started' ? (
                <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-blue-50 text-blue-700 rounded-xl border border-blue-200 shadow-sm">
                  <Clock className="w-3.5 h-3.5 text-blue-600" /> Scheduled Departure
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 shadow-sm">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Live Tracking Active
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">
              {train.name}
            </h1>

            <div className="flex items-center gap-2 text-slate-500 text-xs sm:text-sm font-medium mt-1 flex-wrap">
              <span>{train.source}</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
              <span>{train.destination}</span>
              {totalDistanceKm > 0 && (
                <>
                  <span className="mx-2 text-slate-300">•</span>
                  <span>{totalDistanceKm} km</span>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                toggleFavourite({
                  trainNumber: train.number,
                  trainName: train.name,
                  source: train.source,
                  destination: train.destination,
                  savedAt: new Date().toISOString(),
                })
              }
              className={`p-3 rounded-2xl border transition-all flex items-center gap-2 text-xs font-bold ${
                favourited
                  ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Heart className={`w-4 h-4 ${favourited ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span className="hidden sm:inline">{favourited ? 'Saved' : 'Favourite'}</span>
            </button>

            <button
              onClick={() => setIsShareModalOpen(true)}
              className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-2 text-xs font-bold"
            >
              <Share2 className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">Share</span>
            </button>

            <button
              onClick={handleManualRefresh}
              className="p-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 text-xs font-bold"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh ({refreshSecondsLeft}s)</span>
            </button>
          </div>
        </div>

        {/* Route Progress Bar */}
        {liveStatus.progressPercentage > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
              <span>{train.source}</span>
              <span className="text-blue-600 font-bold">{liveStatus.progressPercentage}% Completed</span>
              <span>{train.destination}</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500 shadow-inner"
                style={{ width: `${Math.min(liveStatus.progressPercentage, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Last Updated */}
        <p className="text-[11px] text-slate-500 mt-3 flex items-center gap-1.5 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          Last updated: <span className="font-semibold text-slate-800">{liveStatus.lastUpdated}</span> · Auto-refreshes every {autoRefreshIntervalSeconds}s
        </p>
      </GlassCard>


      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'status', label: 'Live Status', icon: Navigation },
          { id: 'map', label: 'Interactive Map', icon: MapPin },
          { id: 'analytics', label: 'Journey Analytics', icon: Activity },
          { id: 'weather', label: 'Weather Companion', icon: CloudSun },
          { id: 'geography', label: 'Nearby Geography', icon: Compass },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content Views */}
      {activeTab === 'status' && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              icon={<MapPin className="w-5 h-5" />}
              label="Current Station"
              value={liveStatus.currentStation.name}
              subtext={`Platform ${liveStatus.currentStation.platform || 'N/A'}`}
              badge={liveStatus.currentStation.code}
            />
            <MetricCard
              icon={<Clock className="w-5 h-5" />}
              label="ETA Destination"
              value={liveStatus.etaDestination || '--:--'}
              subtext={liveStatus.delayMinutes > 0 ? `${liveStatus.delayMinutes}m delay` : 'On Schedule'}
              badge={liveStatus.delayMinutes === 0 ? 'On Time' : 'Delayed'}
              badgeType={liveStatus.delayMinutes === 0 ? 'success' : 'warning'}
            />
            <MetricCard
              icon={<Gauge className="w-5 h-5" />}
              label="Covered Distance"
              value={liveStatus.distanceCoveredKm > 0 ? `${liveStatus.distanceCoveredKm} km` : 'N/A'}
              subtext={
                liveStatus.remainingDistanceKm > 0 ? `Remaining: ${liveStatus.remainingDistanceKm} km` : 'Not started'
              }
              badge={liveStatus.progressPercentage > 0 ? `${liveStatus.progressPercentage}%` : '--'}
              badgeType="success"
            />
            <MetricCard
              icon={<Navigation className="w-5 h-5" />}
              label="Current Speed"
              value={
                liveStatus.currentLocation.speedKmh > 0
                  ? `${liveStatus.currentLocation.speedKmh} km/h`
                  : 'Stationary'
              }
              subtext="Live Speedometer"
              badge="Active"
            />
          </div>

          {/* Next & Previous Station Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassCard>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Previous Station
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                {liveStatus.previousStation?.name || 'N/A'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {liveStatus.previousStation
                  ? `Departed at ${liveStatus.previousStation.actualDeparture || liveStatus.previousStation.scheduledDeparture || '--:--'}`
                  : 'Starting station'}
              </p>
            </GlassCard>

            <GlassCard className="border-blue-200 bg-blue-50/30">
              <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Next Station</span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                {liveStatus.nextStation?.name || 'N/A'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Expected Arrival:{' '}
                {liveStatus.nextStation?.scheduledArrival || '--:--'}{' '}
                {liveStatus.nextStation?.platform ? `(Pf #${liveStatus.nextStation.platform})` : ''}
              </p>
            </GlassCard>
          </div>

          {/* Interactive Map Preview */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900">Live Journey Map</h3>
              <button
                onClick={() => setActiveTab('map')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Full Screen Map <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <RouteMap stations={stations} liveStatus={liveStatus} />
          </div>

          {/* Station Timeline & Covered Station Info Card */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" /> Route Station Timeline
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {train.source} → {train.destination}
                </p>
              </div>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100">
                {stations.length} Stations
              </span>
            </div>

            {stations.length > 0 ? (
              <div className="relative pl-6 border-l-2 border-slate-200 space-y-4 my-2">
                {stations.map((st) => {
                  const isPassed = st.status === 'passed';
                  const isCurrent = st.status === 'current';
                  return (
                    <div key={st.id} className="relative group">
                      {/* Circle Indicator */}
                      <div
                        className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-md flex items-center justify-center ${
                          isCurrent
                            ? 'bg-blue-600 ring-4 ring-blue-100 scale-125'
                            : isPassed
                            ? 'bg-emerald-500'
                            : 'bg-slate-300'
                        }`}
                      >
                        {isPassed && <span className="text-[9px] text-white font-bold">✓</span>}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{st.name}</span>
                            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-600 rounded">
                              {st.code}
                            </span>
                            {isCurrent && (
                              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full animate-pulse">
                                🚆 Current
                              </span>
                            )}
                            {isPassed && (
                              <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded-full">
                                ✓ Covered
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {st.distanceFromStartKm > 0 && `${st.distanceFromStartKm} km`}
                            {st.elevationMeters > 0 && ` · ${st.elevationMeters}m elev`}
                            {st.platform && ` · Pf #${st.platform}`}
                          </p>
                        </div>

                        <div className="mt-2 sm:mt-0 text-left sm:text-right">
                          <p className="text-xs font-semibold text-slate-900">
                            Sch: {st.scheduledArrival || '--:--'}
                            {st.actualArrival && ` | Act: ${st.actualArrival}`}
                          </p>
                          <span
                            className={`inline-block text-[11px] font-bold mt-0.5 ${
                              (st.delayMinutes || 0) <= 0 ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            {(st.delayMinutes || 0) <= 0 ? 'On Time' : `+${st.delayMinutes} min delay`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">
                <TrainTrack className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">
                  Full station timeline will appear here once live data is available.
                </p>
                <p className="text-xs mt-1">
                  The train may not have started today's journey yet.
                </p>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {activeTab === 'map' && (
        <div className="space-y-4">
          <RouteMap stations={stations} liveStatus={liveStatus} />
        </div>
      )}

      {activeTab === 'analytics' && (
        <AnalyticsView
          liveStatus={liveStatus}
          elevationData={elevationData || []}
          stations={stations}
        />
      )}

      {activeTab === 'weather' && (
        <WeatherPanel
          currentWeather={currentWeather || null}
          destinationWeather={destinationWeather || null}
        />
      )}

      {activeTab === 'geography' && (
        <GeographyPanel pois={geoPois || []} currentStationName={liveStatus.currentStation.name} />
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        trainNumber={train.number}
        trainName={train.name}
      />
    </div>
  );
}
