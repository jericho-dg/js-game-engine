import { create } from 'zustand';

export type AppView = 'manager' | 'editor';

interface AppState {
  view: AppView;
  isOpenProjectDialogOpen: boolean;
  isNewProjectDialogOpen: boolean;
  showProjectManager: () => void;
  enterEditor: () => void;
  openOpenProjectDialog: () => void;
  closeOpenProjectDialog: () => void;
  openNewProjectDialog: () => void;
  closeNewProjectDialog: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: 'manager',
  isOpenProjectDialogOpen: false,
  isNewProjectDialogOpen: false,

  showProjectManager: () => set({ view: 'manager', isOpenProjectDialogOpen: false }),
  enterEditor: () => set({ view: 'editor', isOpenProjectDialogOpen: false }),
  openOpenProjectDialog: () => set({ isOpenProjectDialogOpen: true }),
  closeOpenProjectDialog: () => set({ isOpenProjectDialogOpen: false }),
  openNewProjectDialog: () => set({ isNewProjectDialogOpen: true }),
  closeNewProjectDialog: () => set({ isNewProjectDialogOpen: false }),
}));
