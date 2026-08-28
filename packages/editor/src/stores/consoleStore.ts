import { create } from 'zustand';

export type ConsoleLevel = 'log' | 'warn' | 'error';

export interface ConsoleEntry {
  id: string;
  level: ConsoleLevel;
  message: string;
  timestamp: number;
}

interface ConsoleState {
  entries: ConsoleEntry[];
  log: (level: ConsoleLevel, message: string) => void;
  clear: () => void;
}

export const useConsoleStore = create<ConsoleState>((set) => ({
  entries: [],

  log: (level, message) => {
    set((state) => ({
      entries: [
        ...state.entries,
        {
          id: crypto.randomUUID(),
          level,
          message,
          timestamp: Date.now(),
        },
      ],
    }));
  },

  clear: () => set({ entries: [] }),
}));
