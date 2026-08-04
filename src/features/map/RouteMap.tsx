'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Station, LiveStatus } from '@/types';
import { useUIStore } from '@/store/uiStore';
import { Navigation, ZoomIn, ZoomOut, Target, Layers } from 'lucide-react';

interface RouteMapProps {
  stations: Station[];
  liveStatus?: LiveStatus;
}

// ── Dark CartoDB Tile Style (Matching User Screenshot) ───────────────────────
const DARK_MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    },
  },
  layers: [
    {
      id: 'carto-dark-layer',
      type: 'raster',
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const LIGHT_MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export default function RouteMap({ stations, liveStatus }: RouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const stationMarkersRef = useRef<maplibregl.Marker[]>([]);

  const { followTrainOnMap, toggleFollowTrain } = useUIStore();
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Compute station progress & split coordinates into covered vs remaining
  const { coveredCoords, remainingCoords, currentIdx } = useMemo(() => {
    if (!stations || stations.length === 0) {
      return { coveredCoords: [], remainingCoords: [], currentIdx: 0 };
    }

    let idx = -1;

    // 1. Try match by liveStatus.currentStation code
    if (liveStatus?.currentStation?.code) {
      const code = liveStatus.currentStation.code.toUpperCase();
      idx = stations.findIndex((s) => s.code.toUpperCase() === code);
    }

    // 2. Try match by station status === 'current'
    if (idx < 0) {
      idx = stations.findIndex((s) => s.status === 'current');
    }

    // 3. Fallback: count passed stations
    if (idx < 0) {
      const passedCount = stations.filter((s) => s.status === 'passed').length;
      idx = Math.max(0, Math.min(passedCount, stations.length - 1));
    }

    const livePt: [number, number] | null = liveStatus?.currentLocation?.lng && liveStatus?.currentLocation?.lat
      ? [liveStatus.currentLocation.lng, liveStatus.currentLocation.lat]
      : null;

    // Covered path: stations[0..idx] + live location
    const covered: [number, number][] = stations.slice(0, idx + 1).map((s) => [s.lng, s.lat]);
    if (livePt && (covered.length === 0 || covered[covered.length - 1][0] !== livePt[0] || covered[covered.length - 1][1] !== livePt[1])) {
      covered.push(livePt);
    }

    // Remaining path: live location + stations[idx..end]
    const remaining: [number, number][] = [];
    if (livePt) {
      remaining.push(livePt);
    }
    const upcomingStations = stations.slice(idx).map((s) => [s.lng, s.lat] as [number, number]);
    upcomingStations.forEach((pt) => {
      if (remaining.length === 0 || remaining[remaining.length - 1][0] !== pt[0] || remaining[remaining.length - 1][1] !== pt[1]) {
        remaining.push(pt);
      }
    });

    return { coveredCoords: covered, remainingCoords: remaining, currentIdx: idx };
  }, [stations, liveStatus]);

  // Center Lat/Lng
  const centerLat = liveStatus?.currentLocation?.lat || stations[0]?.lat || 20.5937;
  const centerLng = liveStatus?.currentLocation?.lng || stations[0]?.lng || 78.9629;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: isDarkMode ? DARK_MAP_STYLE : LIGHT_MAP_STYLE,
      center: [centerLng, centerLat],
      zoom: 7.5,
      pitch: 0,
      attributionControl: false,
    });

    map.on('load', () => {
      mapRef.current = map;
      setTimeout(() => map.resize(), 200);
      setupRouteLayers(map);
      renderStationMarkers(map);
    });

    return () => {
      stationMarkersRef.current.forEach((m) => m.remove());
      stationMarkersRef.current = [];
      if (markerRef.current) markerRef.current.remove();
      map.remove();
    };
  }, [isDarkMode]);

  // Function to setup covered and remaining route line layers
  const setupRouteLayers = (map: maplibregl.Map) => {
    const fullRouteCoords = stations.map((s) => [s.lng, s.lat]);

    // Add Covered Route Source & Layer (Bright Glowing Blue/Cyan - Matching Screenshot)
    if (!map.getSource('covered-route')) {
      map.addSource('covered-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coveredCoords.length >= 2 ? coveredCoords : fullRouteCoords,
          },
        },
      });

      // Covered Glow Layer (Wide Translucent Blue Cyan)
      map.addLayer({
        id: 'covered-route-glow',
        type: 'line',
        source: 'covered-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#38bdf8',
          'line-width': 12,
          'line-opacity': 0.45,
        },
      });

      // Covered Core Line (Solid Bright Cyan Line as in Image)
      map.addLayer({
        id: 'covered-route-line',
        type: 'line',
        source: 'covered-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#00d2ff',
          'line-width': 5,
        },
      });
    }

    // Add Remaining Route Source & Layer (Dashed Translucent Subtle Line)
    if (!map.getSource('remaining-route')) {
      map.addSource('remaining-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: remainingCoords.length >= 2 ? remainingCoords : fullRouteCoords,
          },
        },
      });

      map.addLayer({
        id: 'remaining-route-line',
        type: 'line',
        source: 'remaining-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': isDarkMode ? '#475569' : '#94a3b8',
          'line-width': 3.5,
          'line-dasharray': [2, 2],
          'line-opacity': 0.7,
        },
      });
    }
  };

  // Update Route GeoJSON when coords change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const coveredSource = map.getSource('covered-route') as maplibregl.GeoJSONSource;
    if (coveredSource && coveredCoords.length >= 2) {
      coveredSource.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: coveredCoords },
      });
    }

    const remainingSource = map.getSource('remaining-route') as maplibregl.GeoJSONSource;
    if (remainingSource && remainingCoords.length >= 2) {
      remainingSource.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: remainingCoords },
      });
    }
  }, [coveredCoords, remainingCoords]);

  // Render Station Markers
  const renderStationMarkers = (map: maplibregl.Map) => {
    stationMarkersRef.current.forEach((m) => m.remove());
    stationMarkersRef.current = [];

    stations.forEach((station, idx) => {
      const isPassed = idx < currentIdx;
      const isCurrent = idx === currentIdx;

      const el = document.createElement('div');
      el.className = `group relative cursor-pointer transition-transform hover:scale-125 flex items-center justify-center`;

      if (isCurrent) {
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <span class="animate-ping absolute inline-flex h-7 w-7 rounded-full bg-cyan-400 opacity-75"></span>
            <div class="w-6 h-6 rounded-full bg-cyan-500 border-2 border-white shadow-[0_0_12px_rgba(6,182,212,0.9)] flex items-center justify-center">
              <div class="w-2 h-2 rounded-full bg-white"></div>
            </div>
          </div>
        `;
      } else if (isPassed) {
        el.className += ' w-4 h-4 rounded-full bg-cyan-400 border-2 border-white shadow-md flex items-center justify-center';
        el.innerHTML = `<div class="w-1 h-1 rounded-full bg-slate-900"></div>`;
      } else {
        el.className += ' w-3.5 h-3.5 rounded-full bg-slate-600 border border-slate-400 shadow flex items-center justify-center opacity-70';
      }

      const popup = new maplibregl.Popup({ offset: 12, closeButton: false }).setHTML(`
        <div style="font-family: system-ui, sans-serif; padding: 6px; min-width: 140px; background: #0f172a; color: #fff; border-radius: 8px;">
          <div style="font-weight: 700; font-size: 12px; color: #38bdf8;">${station.name} (${station.code})</div>
          <div style="font-size: 11px; color: #cbd5e1; margin-top: 2px;">
            Arr: ${station.scheduledArrival} | Pf #${station.platform || '1'}
          </div>
          <div style="font-size: 10px; color: ${station.delayMinutes <= 0 ? '#4ade80' : '#fbbf24'}; font-weight: 600; margin-top: 2px;">
            ${station.delayMinutes <= 0 ? 'On Time' : `Delayed +${station.delayMinutes}m`}
          </div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el }).setLngLat([station.lng, station.lat]).setPopup(popup).addTo(map);
      stationMarkersRef.current.push(marker);
    });
  };

  useEffect(() => {
    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      renderStationMarkers(mapRef.current);
    }
  }, [stations, currentIdx]);

  // Train Marker & Camera Following Update
  useEffect(() => {
    if (!mapRef.current || !liveStatus) return;

    const map = mapRef.current;
    const { lat, lng, speedKmh } = liveStatus.currentLocation;

    if (!markerRef.current) {
      const el = document.createElement('div');
      el.className = 'relative flex items-center justify-center z-30';
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <span class="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-cyan-400 opacity-60"></span>
          <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 border-2 border-white shadow-[0_0_16px_rgba(6,182,212,0.9)] flex items-center justify-center text-white text-lg font-bold">
            🚆
          </div>
          <div class="absolute -bottom-6 bg-slate-900/90 text-cyan-300 backdrop-blur-md text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-cyan-500/30 shadow-lg whitespace-nowrap">
            ${speedKmh} km/h
          </div>
        </div>
      `;
      markerRef.current = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }

    if (followTrainOnMap) {
      map.easeTo({
        center: [lng, lat],
        zoom: 8.5,
        duration: 1000,
      });
    }
  }, [liveStatus, followTrainOnMap]);

  // Controls handler
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleRecenter = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: [centerLng, centerLat],
      zoom: 7.5,
      duration: 1200,
    });
  };

  return (
    <div className="relative w-full h-[480px] lg:h-[580px] rounded-3xl overflow-hidden border border-slate-700/60 shadow-2xl bg-slate-950">
      {/* Map Container Element */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Control Buttons (Matching screenshot overlay controls) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 backdrop-blur-md shadow-xl transition-all"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 backdrop-blur-md shadow-xl transition-all"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleRecenter}
          title="Recenter Map"
          className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 backdrop-blur-md shadow-xl transition-all"
        >
          <Target className="w-4 h-4" />
        </button>
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          title="Toggle Dark/Light Map Theme"
          className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-cyan-400 border border-slate-700/80 backdrop-blur-md shadow-xl transition-all"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>

      {/* Camera Follow Toggle */}
      <div className="absolute top-4 left-4 z-20">
        <button
          onClick={toggleFollowTrain}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold shadow-xl backdrop-blur-md border transition-all ${
            followTrainOnMap
              ? 'bg-cyan-500/90 text-slate-950 border-cyan-400 shadow-cyan-500/30'
              : 'bg-slate-900/80 text-slate-200 border-slate-700 hover:bg-slate-800'
          }`}
        >
          <Navigation className={`w-3.5 h-3.5 ${followTrainOnMap ? 'animate-spin' : ''}`} />
          {followTrainOnMap ? 'Live Camera Lock' : 'Lock Camera'}
        </button>
      </div>

      {/* Floating Live Train Overlay Info Card */}
      {liveStatus && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-20 bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl flex items-center justify-between gap-4 max-w-sm shadow-2xl border border-slate-700/80 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-cyan-500/20">
              🚆
            </div>
            <div>
              <p className="text-xs font-bold text-white tracking-tight">{liveStatus.currentStation.name}</p>
              <p className="text-[11px] text-slate-400 font-medium">
                Speed: <span className="font-mono font-bold text-cyan-400">{liveStatus.currentLocation.speedKmh} km/h</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {liveStatus.status}
            </span>
            <p className="text-[10px] text-slate-400 mt-1">Refreshed: {liveStatus.lastUpdated}</p>
          </div>
        </div>
      )}
    </div>
  );
}
