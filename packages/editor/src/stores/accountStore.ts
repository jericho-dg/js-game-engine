import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  signIn as authSignIn,
  signOut as authSignOut,
  signUp as authSignUp,
  usesSupabaseAuth,
  validateSession,
} from '../services/cloud/authService';

interface AccountState {
  userId: string | null;
  displayName: string;
  email: string;
  token: string | null;
  signUp: (credentials: {
    email?: string;
    displayName: string;
    password: string;
  }) => Promise<void>;
  signIn: (credentials: {
    email?: string;
    displayName?: string;
    password: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  isSignedIn: () => boolean;
  usesSupabaseAuth: () => boolean;
  validateSession: () => Promise<boolean>;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      userId: null,
      displayName: '',
      email: '',
      token: null,

      signUp: async (credentials) => {
        const result = await authSignUp(credentials);
        set({
          userId: result.userId,
          displayName: result.displayName,
          email: result.email ?? '',
          token: result.token,
        });
      },

      signIn: async (credentials) => {
        const result = await authSignIn(credentials);
        set({
          userId: result.userId,
          displayName: result.displayName,
          email: result.email ?? '',
          token: result.token,
        });
      },

      signOut: async () => {
        const token = get().token;
        await authSignOut(token);
        set({ userId: null, displayName: '', email: '', token: null });
      },

      isSignedIn: () => Boolean(get().token && get().displayName.trim()),

      usesSupabaseAuth,

      validateSession: async () => {
        const token = get().token;
        if (!token) return false;

        const refreshed = await validateSession(token);
        if (!refreshed) {
          set({ userId: null, displayName: '', email: '', token: null });
          return false;
        }

        set({
          userId: refreshed.userId,
          displayName: refreshed.displayName,
          email: refreshed.email ?? get().email,
          token: refreshed.token,
        });
        return true;
      },
    }),
    { name: 'jge-account' },
  ),
);
