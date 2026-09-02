import { create } from 'zustand';
import type { PrefabRecord } from '@js-game-engine/shared';

interface PrefabState {
  prefabs: PrefabRecord[];
  isSaveDialogOpen: boolean;
  setPrefabs: (prefabs: PrefabRecord[]) => void;
  addPrefab: (prefab: PrefabRecord) => void;
  deletePrefab: (id: string) => void;
  getPrefab: (id: string) => PrefabRecord | undefined;
  openSaveDialog: () => void;
  closeSaveDialog: () => void;
}

export const usePrefabStore = create<PrefabState>((set, get) => ({
  prefabs: [],
  isSaveDialogOpen: false,

  setPrefabs: (prefabs) => set({ prefabs }),

  addPrefab: (prefab) =>
    set((state) => ({
      prefabs: [...state.prefabs, prefab],
    })),

  deletePrefab: (id) =>
    set((state) => ({
      prefabs: state.prefabs.filter((prefab) => prefab.id !== id),
    })),

  getPrefab: (id) => get().prefabs.find((prefab) => prefab.id === id),

  openSaveDialog: () => set({ isSaveDialogOpen: true }),

  closeSaveDialog: () => set({ isSaveDialogOpen: false }),
}));
