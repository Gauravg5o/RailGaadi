'use client';

import React from 'react';
import { WeatherData } from '@/types';
import GlassCard from '@/components/ui/GlassCard';
import { CloudSun, Sun, CloudRain, Wind, Droplets, Umbrella } from 'lucide-react';

interface WeatherPanelProps {
  currentWeather: WeatherData | null;
  destinationWeather?: WeatherData | null;
}

const DEFAULT_WEATHER: WeatherData = {
  stationCode: 'STN',
  stationName: 'Station Corridor',
  temperature: 28,
  condition: 'Partly Cloudy',
  humidity: 56,
  windSpeedKmh: 12,
  rainProbability: 10,
  icon: '02d',
  forecast: [
    { time: '12:00', temp: 29, condition: 'Sunny' },
    { time: '15:00', temp: 30, condition: 'Sunny' },
    { time: '18:00', temp: 27, condition: 'Partly Cloudy' },
    { time: '21:00', temp: 25, condition: 'Clear' },
  ],
};

export default function WeatherPanel({ currentWeather, destinationWeather }: WeatherPanelProps) {
  const weather = currentWeather || DEFAULT_WEATHER;

  const getWeatherIcon = (condition: string, isLight = false) => {
    switch (condition.toLowerCase()) {
      case 'sunny':
      case 'clear':
        return <Sun className={`w-8 h-8 ${isLight ? 'text-amber-300' : 'text-amber-500'}`} />;
      case 'rain':
      case 'thunderstorm':
        return <CloudRain className={`w-8 h-8 ${isLight ? 'text-sky-300' : 'text-blue-500'}`} />;
      default:
        return <CloudSun className={`w-8 h-8 ${isLight ? 'text-sky-200' : 'text-sky-500'}`} />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Current Station Weather Main Gradient Card (Solid High-Contrast Blue/Indigo) */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 text-white p-6 sm:p-8 rounded-3xl shadow-2xl border border-blue-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <span className="px-3.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold tracking-wider uppercase text-blue-100">
              Current Station Weather
            </span>
            <h2 className="text-2xl sm:text-4xl font-black mt-3 text-white tracking-tight">
              {weather.stationName} <span className="text-blue-200 text-xl font-bold">({weather.stationCode})</span>
            </h2>
            <p className="text-sm font-semibold text-blue-100 mt-1">{weather.condition}</p>
          </div>

          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/15">
            {getWeatherIcon(weather.condition, true)}
            <div className="text-4xl sm:text-5xl font-black tracking-tight text-white">{weather.temperature}°C</div>
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="mt-8 grid grid-cols-3 gap-4 pt-6 border-t border-white/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl">
              <Droplets className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <p className="text-[11px] text-blue-200 uppercase font-bold tracking-wider">Humidity</p>
              <p className="text-lg font-black text-white">{weather.humidity}%</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl">
              <Wind className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <p className="text-[11px] text-blue-200 uppercase font-bold tracking-wider">Wind Speed</p>
              <p className="text-lg font-black text-white">{weather.windSpeedKmh} km/h</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl">
              <Umbrella className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <p className="text-[11px] text-blue-200 uppercase font-bold tracking-wider">Rain Chance</p>
              <p className="text-lg font-black text-white">{weather.rainProbability}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Forecast Strip */}
      <GlassCard>
        <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-4 flex items-center gap-2">
          <CloudSun className="w-5 h-5 text-blue-600" /> Hourly Station Forecast
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {weather.forecast.map((f, i) => (
            <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center text-center shadow-sm">
              <span className="text-xs font-semibold text-slate-500">{f.time}</span>
              <div className="my-2">{getWeatherIcon(f.condition)}</div>
              <span className="text-xl font-black text-slate-900">{f.temp}°C</span>
              <span className="text-[11px] font-medium text-slate-600">{f.condition}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Destination Weather Preview */}
      {destinationWeather && (
        <GlassCard hoverable>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 border border-amber-100">
                {getWeatherIcon(destinationWeather.condition)}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Destination Weather</span>
                <h4 className="font-bold text-slate-900 text-base">{destinationWeather.stationName}</h4>
                <p className="text-xs text-slate-500 font-medium">{destinationWeather.condition} • Humidity {destinationWeather.humidity}%</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-slate-900">{destinationWeather.temperature}°C</span>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
