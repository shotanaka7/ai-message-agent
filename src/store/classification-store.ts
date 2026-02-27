import { create } from 'zustand';
import type { ClassificationProgress } from '../types';

interface ClassificationStoreState {
  currentJob: ClassificationProgress | null;
  isClassifying: boolean;
  setProgress: (progress: ClassificationProgress) => void;
  setClassifying: (classifying: boolean) => void;
  clearJob: () => void;
}

export const useClassificationStore = create<ClassificationStoreState>((set) => ({
  currentJob: null,
  isClassifying: false,
  setProgress: (progress) => set({ currentJob: progress }),
  setClassifying: (classifying) => set({ isClassifying: classifying }),
  clearJob: () => set({ currentJob: null, isClassifying: false }),
}));
