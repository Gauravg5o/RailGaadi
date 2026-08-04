import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FavouriteTrain, RecentSearch } from '@/types';

interface PreferencesState {
  recentSearches: RecentSearch[];
  favourites: FavouriteTrain[];
  mapStyle: 'streets' | 'satellite';
  autoRefreshIntervalSeconds: number;
  reduceAnimations: boolean;
  addRecentSearch: (search: RecentSearch) => void;
  clearRecentSearches: () => void;
  toggleFavourite: (favourite: FavouriteTrain) => void;
  isFavourite: (trainNumber: string) => boolean;
  setMapStyle: (style: 'streets' | 'satellite') => void;
  setAutoRefreshInterval: (seconds: number) => void;
  setReduceAnimations: (reduce: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      recentSearches: [
        { trainNumber: '22436', trainName: 'Vande Bharat Express', searchedAt: new Date().toISOString() },
        { trainNumber: '12951', trainName: 'Mumbai Rajdhani Express', searchedAt: new Date().toISOString() },
      ],
      favourites: [
        {
          trainNumber: '22436',
          trainName: 'Vande Bharat Express',
          source: 'New Delhi (NDLS)',
          destination: 'Varanasi Junction (BSB)',
          savedAt: new Date().toISOString(),
        },
      ],
      mapStyle: 'streets',
      autoRefreshIntervalSeconds: 30,
      reduceAnimations: false,

      addRecentSearch: (search) => {
        set((state) => {
          const filtered = state.recentSearches.filter((s) => s.trainNumber !== search.trainNumber);
          return { recentSearches: [search, ...filtered].slice(0, 8) };
        });
      },

      clearRecentSearches: () => set({ recentSearches: [] }),

      toggleFavourite: (favourite) => {
        set((state) => {
          const exists = state.favourites.some((f) => f.trainNumber === favourite.trainNumber);
          if (exists) {
            return { favourites: state.favourites.filter((f) => f.trainNumber !== favourite.trainNumber) };
          } else {
            return { favourites: [favourite, ...state.favourites] };
          }
        });
      },

      isFavourite: (trainNumber) => {
        return get().favourites.some((f) => f.trainNumber === trainNumber);
      },

      setMapStyle: (mapStyle) => set({ mapStyle }),
      setAutoRefreshInterval: (autoRefreshIntervalSeconds) => set({ autoRefreshIntervalSeconds }),
      setReduceAnimations: (reduceAnimations) => set({ reduceAnimations }),
    }),
    {
      name: 'railgaadi-preferences',
    }
  )
);
