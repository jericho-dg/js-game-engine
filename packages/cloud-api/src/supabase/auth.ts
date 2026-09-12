import { getSupabaseAdmin } from './client.js';
import type { AuthUser } from '../store/types.js';

const AUTH_HANDLED_BY_CLIENT =
  'Authentication is handled by Supabase in the editor. Sign in there first.';

export function authHandledByClientError(): Error {
  return new Error(AUTH_HANDLED_BY_CLIENT);
}

export async function authenticateSupabaseJwt(
  token: string | undefined,
): Promise<AuthUser | null> {
  if (!token?.trim()) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  const user = data.user;
  let displayName =
    typeof user.user_metadata?.display_name === 'string'
      ? user.user_metadata.display_name.trim()
      : '';

  if (!displayName) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle();
    displayName = profile?.display_name?.trim() ?? '';
  }

  if (!displayName) {
    displayName = user.email?.split('@')[0] ?? 'User';
  }

  return {
    userId: user.id,
    displayName,
  };
}
