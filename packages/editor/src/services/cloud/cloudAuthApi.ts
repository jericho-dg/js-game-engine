import type {
  CloudApiAuthRequest,
  CloudApiAuthResponse,
  CloudApiErrorResponse,
} from '@js-game-engine/shared';

function getAuthBaseUrl(): string {
  const apiUrl = import.meta.env.VITE_CLOUD_API_URL as string | undefined;
  if (!apiUrl) {
    throw new Error('Cloud API URL is not configured.');
  }
  return apiUrl.replace(/\/$/, '');
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
  const response = await fetch(`${getAuthBaseUrl()}/v1/auth/session`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.ok;
}
