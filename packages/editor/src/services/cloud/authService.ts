import {
  fetchCloudSession,
  signInWithCloudApi,
  signOutFromCloudApi,
  signUpWithCloudApi,
} from './cloudAuthApi';
import { isSupabaseAuthEnabled } from '../supabase/client';
import {
  refreshSupabaseSession,
  signInWithSupabase,
  signOutFromSupabase,
  signUpWithSupabase,
  type SupabaseAuthResult,
} from '../supabase/supabaseAuth';
import type { CloudApiAuthResponse } from '@js-game-engine/shared';

export interface AuthSession {
  token: string;
  userId: string;
  displayName: string;
  email?: string;
}

export function usesSupabaseAuth(): boolean {
  return isSupabaseAuthEnabled();
}

export async function signUp(
  credentials: { email?: string; displayName: string; password: string },
): Promise<AuthSession> {
  if (usesSupabaseAuth()) {
    const result = await signUpWithSupabase(
      credentials.email ?? '',
      credentials.password,
      credentials.displayName,
    );
    return toAuthSession(result);
  }

  const result = await signUpWithCloudApi({
    displayName: credentials.displayName,
    password: credentials.password,
  });
  return toAuthSession(result);
}

export async function signIn(
  credentials: { email?: string; displayName?: string; password: string },
): Promise<AuthSession> {
  if (usesSupabaseAuth()) {
    const result = await signInWithSupabase(
      credentials.email ?? '',
      credentials.password,
    );
    return toAuthSession(result);
  }

  const result = await signInWithCloudApi({
    displayName: credentials.displayName ?? '',
    password: credentials.password,
  });
  return toAuthSession(result);
}

export async function signOut(token: string | null): Promise<void> {
  if (usesSupabaseAuth()) {
    await signOutFromSupabase();
    return;
  }
  await signOutFromCloudApi(token);
}

export async function validateSession(token: string): Promise<AuthSession | null> {
  if (usesSupabaseAuth()) {
    return refreshSupabaseSession(token);
  }

  const session = await fetchCloudSession(token);
  if (!session) return null;
  return toAuthSession(session);
}

function toAuthSession(
  result: CloudApiAuthResponse | SupabaseAuthResult,
): AuthSession {
  return {
    token: result.token,
    userId: result.userId,
    displayName: result.displayName,
    ...('email' in result ? { email: result.email } : {}),
  };
}
