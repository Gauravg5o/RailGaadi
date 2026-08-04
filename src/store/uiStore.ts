import { create } from 'zustand';

interface UIState {
  followTrainOnMap: boolean;
  activeTab: 'status' | 'map' | 'analytics' | 'weather' | 'geography';
  isShareModalOpen: boolean;
  selectedStationId: string | null;
  toggleFollowTrain: () => void;
  setFollowTrain: (follow: boolean) => void;
  setActiveTab: (tab: 'status' | 'map' | 'analytics' | 'weather' | 'geography') => void;
  setIsShareModalOpen: (open: boolean) => void;
  setSelectedStationId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  followTrainOnMap: true,
  activeTab: 'status',
  isShareModalOpen: false,
  selectedStationId: null,

  toggleFollowTrain: () => set((state) => ({ followTrainOnMap: !state.followTrainOnMap })),
  setFollowTrain: (followTrainOnMap) => set({ followTrainOnMap }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setIsShareModalOpen: (isShareModalOpen) => set({ isShareModalOpen }),
  setSelectedStationId: (selectedStationId) => set({ selectedStationId }),
}));
