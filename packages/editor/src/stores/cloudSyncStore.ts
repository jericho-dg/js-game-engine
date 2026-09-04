import { create } from 'zustand';

export type CloudSyncMode = 'simulated' | 'remote';

export type CloudSyncStatus =
  | 'idle'
  | 'syncing'
  | 'synced'
  | 'pending'
  | 'error';

interface CloudSyncState {
  mode: CloudSyncMode;
  status: CloudSyncStatus;
  lastSyncedAt: number | null;
  pendingCount: number;
  errorMessage: string | null;
  refreshMode: () => void;
  setSyncing: () => void;
  setSynced: (timestamp?: number) => void;
  setPending: (count: number, message?: string | null) => void;
  setError: (message: string, pendingCount: number) => void;
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

  refreshMode: () => set({ mode: detectMode() }),

  setSyncing: () =>
    set((state) => ({
      status: 'syncing',
      errorMessage: state.status === 'error' ? state.errorMessage : null,
    })),

  setSynced: (timestamp = Date.now()) =>
    set({
      status: 'synced',
      lastSyncedAt: timestamp,
      pendingCount: 0,
      errorMessage: null,
    }),

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

  clearError: () =>
    set((state) => ({
      errorMessage: null,
      status: state.pendingCount > 0 ? 'pending' : state.lastSyncedAt ? 'synced' : 'idle',
    })),
}));
