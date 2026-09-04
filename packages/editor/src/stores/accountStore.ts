import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  signInWithCloudApi,
  signOutFromCloudApi,
  signUpWithCloudApi,
  validateCloudSession,
} from '../services/cloud/cloudAuthApi';

interface AccountState {
  userId: string | null;
  displayName: string;
  token: string | null;
  signUp: (displayName: string, password: string) => Promise<void>;
  signIn: (displayName: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isSignedIn: () => boolean;
  validateSession: () => Promise<boolean>;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      userId: null,
      displayName: '',
      token: null,

      signUp: async (displayName, password) => {
        const result = await signUpWithCloudApi({ displayName, password });
        set({
          userId: result.userId,
          displayName: result.displayName,
          token: result.token,
        });
      },

      signIn: async (displayName, password) => {
        const result = await signInWithCloudApi({ displayName, password });
        set({
          userId: result.userId,
          displayName: result.displayName,
          token: result.token,
        });
      },

      signOut: async () => {
        const token = get().token;
        await signOutFromCloudApi(token);
        set({ displayName: '', token: null });
      },

      isSignedIn: () => Boolean(get().token && get().displayName.trim()),

      validateSession: async () => {
        const token = get().token;
        if (!token) return false;
        const valid = await validateCloudSession(token);
        if (!valid) {
          set({ displayName: '', token: null });
        }
        return valid;
      },
    }),
    { name: 'jge-account' },
  ),
);
