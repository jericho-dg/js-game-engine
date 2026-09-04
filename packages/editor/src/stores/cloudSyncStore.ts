import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CloudSyncState {
  isConnected: boolean;
  displayName: string;
  connect: (displayName?: string) => void;
  disconnect: () => void;
}

export const useCloudSyncStore = create<CloudSyncState>()(
  persist(
    (set) => ({
      isConnected: false,
      displayName: 'Developer',

      connect: (displayName) =>
        set({
          isConnected: true,
          displayName: displayName?.trim() || 'Developer',
        }),

      disconnect: () =>
        set({
          isConnected: false,
        }),
    }),
    {
      name: 'jge-cloud-sync',
    },
  ),
);
