import { create } from 'zustand';
import type { SyncProgress } from '../types';

interface SyncStoreState {
  progresses: Record<string, SyncProgress>;
  globalSyncing: boolean;
  setProgress: (sourceId: string, progress: SyncProgress) => void;
  setGlobalSyncing: (syncing: boolean) => void;
  clearProgresses: () => void;
}

export const useSyncStore = create<SyncStoreState>((set) => ({
  progresses: {},
  globalSyncing: false,
  setProgress: (sourceId, progress) =>
    set((state) => ({
      progresses: { ...state.progresses, [sourceId]: progress },
    })),
  setGlobalSyncing: (syncing) => set({ globalSyncing: syncing }),
  clearProgresses: () => set({ progresses: {} }),
}));
