import { getSupabaseClient } from './client';

export interface SupabaseAuthResult {
  token: string;
  userId: string;
  displayName: string;
  email: string;
}

function displayNameFromUser(user: {
  email?: string;
  user_metadata?: Record<string, unknown>;
}): string {
  const fromMetadata = user.user_metadata?.display_name;
  if (typeof fromMetadata === 'string' && fromMetadata.trim()) {
    return fromMetadata.trim();
  }
  return user.email?.split('@')[0] ?? 'User';
}

function mapSession(
  session: { access_token: string },
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> },
): SupabaseAuthResult {
  return {
    token: session.access_token,
    userId: user.id,
    displayName: displayNameFromUser(user),
    email: user.email ?? '',
  };
}

export async function signUpWithSupabase(
  email: string,
  password: string,
  displayName: string,
): Promise<SupabaseAuthResult> {
  const supabase = getSupabaseClient();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedDisplayName = displayName.trim();

  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }
  if (!normalizedDisplayName) {
    throw new Error('Display name is required.');
  }
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: { display_name: normalizedDisplayName },
    },
  });

  if (error) {
    throw new Error(error.message);
  }
  if (!data.session || !data.user) {
    throw new Error(
      'Account created. Check your email to confirm your address, then sign in.',
    );
  }

  return mapSession(data.session, data.user);
}

export async function signInWithSupabase(
  email: string,
  password: string,
): Promise<SupabaseAuthResult> {
  const supabase = getSupabaseClient();
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }
  if (!data.session || !data.user) {
    throw new Error('Sign in failed.');
  }

  return mapSession(data.session, data.user);
}

export async function signOutFromSupabase(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

export async function refreshSupabaseSession(
  token: string,
): Promise<SupabaseAuthResult | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  return mapSession({ access_token: token }, data.user);
}
