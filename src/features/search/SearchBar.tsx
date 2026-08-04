'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, TrainTrack, X, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { Train } from '@/types';
import { searchTrains } from '@/services/trainService';
import { usePreferencesStore } from '@/store/preferencesStore';

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Train[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const { recentSearches, addRecentSearch } = usePreferencesStore();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchTrains(query);
        setResults(res);
      } catch (err) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectTrain = (train: Train) => {
    addRecentSearch({
      trainNumber: train.number,
      trainName: train.name,
      searchedAt: new Date().toISOString(),
    });
    setIsOpen(false);
    setQuery('');
    router.push(`/train/${train.number}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelectTrain(results[selectedIndex]);
      } else if (results.length > 0) {
        handleSelectTrain(results[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Search Input Box */}
      <div className="relative flex items-center shadow-lg rounded-2xl bg-white border border-slate-200/90 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100 transition-all">
        <div className="pl-4 text-slate-400">
          {loading ? <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> : <Search className="w-5 h-5 text-blue-600" />}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search by train number (e.g. 22436, 12951) or train name..."
          className="w-full py-4 pl-3 pr-10 bg-transparent text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none rounded-2xl"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              inputRef.current?.focus();
            }}
            className="pr-4 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-96 overflow-y-auto animate-fade-in">
          {results.length > 0 ? (
            <div className="py-2">
              <div className="px-4 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Matching Trains ({results.length})
              </div>
              {results.map((train, idx) => (
                <div
                  key={train.id}
                  onClick={() => handleSelectTrain(train)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-4 py-3 cursor-pointer flex items-center justify-between transition-colors ${
                    selectedIndex === idx ? 'bg-blue-50/80 text-blue-900' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-100/70 text-blue-700 font-mono font-bold text-xs">
                      {train.number}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{train.name}</span>
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded-md">
                          {train.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {train.source} → {train.destination}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              ))}
            </div>
          ) : query.trim() !== '' && !loading ? (
            <div className="p-6 text-center text-slate-500 text-sm">
              <p className="font-semibold text-slate-700">No train found matching &quot;{query}&quot;</p>
              <p className="text-xs mt-1">Try searching with train number &quot;22436&quot; or &quot;12951&quot;</p>
            </div>
          ) : recentSearches.length > 0 ? (
            <div className="py-3 px-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Recent Searches
                </span>
              </div>
              <div className="mt-2 space-y-1">
                {recentSearches.map((item) => (
                  <div
                    key={item.trainNumber}
                    onClick={() => router.push(`/train/${item.trainNumber}`)}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                        {item.trainNumber}
                      </span>
                      <span className="font-medium text-slate-800">{item.trainName}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
