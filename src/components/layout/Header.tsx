'use client';

import React from 'react';
import Link from 'next/link';
import { TrainTrack, Heart, Settings, Search } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 glass-panel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <TrainTrack className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-tight text-slate-900">RailGaadi</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-md">LIVE</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Train Intelligence Platform</p>
          </div>
        </Link>

        {/* Quick Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            href="/"
            className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
              pathname === '/' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span className="flex items-center gap-2">
              <Search className="w-4 h-4" /> Live Tracking
            </span>
          </Link>
          <Link
            href="/favourites"
            className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
              pathname === '/favourites' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span className="flex items-center gap-2">
              <Heart className="w-4 h-4" /> Favourites
            </span>
          </Link>
          <Link
            href="/settings"
            className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
              pathname === '/settings' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4" /> Settings
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
