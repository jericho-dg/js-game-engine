import type {
  CloudApiAuthRequest,
  CloudApiAuthResponse,
  CloudApiErrorResponse,
} from '@js-game-engine/shared';
import { resolveCloudApiBaseUrl } from './cloudApiUrl';

function getAuthBaseUrl(): string {
  const apiUrl = resolveCloudApiBaseUrl();
  if (!apiUrl) {
    throw new Error('Cloud API URL is not configured.');
  }
  return apiUrl;
}

async function readAuthError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as CloudApiErrorResponse;
    return body.error ?? `Authentication failed (${response.status})`;
  } catch {
    return `Authentication failed (${response.status})`;
  }
}

export async function signUpWithCloudApi(
  credentials: CloudApiAuthRequest,
): Promise<CloudApiAuthResponse> {
  const response = await fetch(`${getAuthBaseUrl()}/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    throw new Error(await readAuthError(response));
  }

  return (await response.json()) as CloudApiAuthResponse;
}

export async function signInWithCloudApi(
  credentials: CloudApiAuthRequest,
): Promise<CloudApiAuthResponse> {
  const response = await fetch(`${getAuthBaseUrl()}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    throw new Error(await readAuthError(response));
  }

  return (await response.json()) as CloudApiAuthResponse;
}

export async function signOutFromCloudApi(token: string | null): Promise<void> {
  if (!token) return;

  await fetch(`${getAuthBaseUrl()}/v1/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function validateCloudSession(token: string): Promise<boolean> {
  const session = await fetchCloudSession(token);
  return session !== null;
}

export async function fetchCloudSession(
  token: string,
): Promise<CloudApiAuthResponse | null> {
  const response = await fetch(`${getAuthBaseUrl()}/v1/auth/session`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    return null;
  }

  const user = (await response.json()) as { userId: string; displayName: string };
  return {
    token,
    userId: user.userId,
    displayName: user.displayName,
  };
}
