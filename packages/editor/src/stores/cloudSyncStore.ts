import { create } from 'zustand';
import type { SyncConflict } from '@js-game-engine/shared';

export type CloudSyncMode = 'simulated' | 'remote';

export type CloudSyncStatus =
  | 'idle'
  | 'syncing'
  | 'synced'
  | 'pending'
  | 'error'
  | 'conflict';

interface CloudSyncState {
  mode: CloudSyncMode;
  status: CloudSyncStatus;
  lastSyncedAt: number | null;
  pendingCount: number;
  errorMessage: string | null;
  conflicts: SyncConflict[];
  refreshMode: () => void;
  setSyncing: () => void;
  setSynced: (timestamp?: number) => void;
  setPending: (count: number, message?: string | null) => void;
  setError: (message: string, pendingCount: number) => void;
  setConflicts: (conflicts: SyncConflict[]) => void;
  removeConflict: (localProjectId: string) => void;
  clearError: () => void;
}

function detectMode(): CloudSyncMode {
  return import.meta.env.VITE_CLOUD_API_URL ? 'remote' : 'simulated';
}

export const useCloudSyncStore = create<CloudSyncState>((set, get) => ({
  mode: detectMode(),
  status: 'idle',
  lastSyncedAt: null,
  pendingCount: 0,
  errorMessage: null,
  conflicts: [],

  refreshMode: () => set({ mode: detectMode() }),

  setSyncing: () =>
    set((state) => ({
      status: 'syncing',
      errorMessage: state.status === 'error' ? state.errorMessage : null,
    })),

  setSynced: (timestamp = Date.now()) =>
    set((state) => ({
      status: state.conflicts.length > 0 ? 'conflict' : 'synced',
      lastSyncedAt: timestamp,
      pendingCount: 0,
      errorMessage: null,
    })),

  setPending: (count, message = null) =>
    set({
      status: count > 0 ? 'pending' : get().status,
      pendingCount: count,
      errorMessage: message,
    }),

  setError: (message, pendingCount) =>
    set({
      status: 'error',
      errorMessage: message,
      pendingCount,
    }),

  setConflicts: (conflicts) =>
    set({
      conflicts,
      status: conflicts.length > 0 ? 'conflict' : get().status,
    }),

  removeConflict: (localProjectId) =>
    set((state) => {
      const conflicts = state.conflicts.filter(
        (conflict) => conflict.localProjectId !== localProjectId,
      );
      return {
        conflicts,
        status:
          conflicts.length > 0
            ? 'conflict'
            : state.pendingCount > 0
              ? 'pending'
              : state.lastSyncedAt
                ? 'synced'
                : 'idle',
      };
    }),

  clearError: () =>
    set((state) => ({
      errorMessage: null,
      status:
        state.conflicts.length > 0
          ? 'conflict'
          : state.pendingCount > 0
            ? 'pending'
            : state.lastSyncedAt
              ? 'synced'
              : 'idle',
    })),
}));
