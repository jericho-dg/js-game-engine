import type {
  CloudApiErrorResponse,
  CloudApiShareLinkResponse,
  CloudApiSharedProjectInfo,
} from '@js-game-engine/shared';
import { useAccountStore } from '../stores/accountStore';
import { db } from './db';
import { isRemoteCloudEnabled } from './cloud/getCloudBackend';
import { resolveCloudApiBaseUrl } from './cloud/cloudApiUrl';
import { cloudSyncService } from './cloudSyncService';
import { importProjectArchiveToDb } from './projectArchive';

function getCloudApiBase(): string {
  const apiUrl = resolveCloudApiBaseUrl();
  if (!apiUrl) {
    throw new Error('Project sharing requires the remote cloud API.');
  }
  return apiUrl;
}

function authHeaders(): HeadersInit {
  const token = useAccountStore.getState().token;
  if (!token) {
    throw new Error('Sign in to share or import projects.');
  }
  return { Authorization: `Bearer ${token}` };
}

async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as CloudApiErrorResponse;
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

export function canShareProjects(): boolean {
  return isRemoteCloudEnabled() && useAccountStore.getState().isSignedIn();
}

export function buildLocalShareUrl(shareToken: string): string {
  return `${window.location.origin.replace(/\/$/, '')}/?share=${encodeURIComponent(shareToken)}`;
}

export async function createProjectShareLink(
  localProjectId: string,
): Promise<{ shareToken: string; shareUrl: string; projectName: string }> {
  await cloudSyncService.syncProject(localProjectId);

  const stored = await db.projects.get(localProjectId);
  if (!stored?.cloudId) {
    throw new Error('Project must be synced to the cloud before sharing.');
  }

  const response = await fetch(
    `${getCloudApiBase()}/v1/projects/${stored.cloudId}/share`,
    {
      method: 'POST',
      headers: authHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response, `Share failed (${response.status})`));
  }

  const result = (await response.json()) as CloudApiShareLinkResponse;
  return {
    shareToken: result.shareToken,
    shareUrl: buildLocalShareUrl(result.shareToken),
    projectName: result.projectName,
  };
}

export async function fetchSharedProjectInfo(
  shareToken: string,
): Promise<CloudApiSharedProjectInfo> {
  const response = await fetch(
    `${getCloudApiBase()}/v1/shared/${encodeURIComponent(shareToken)}`,
    { headers: authHeaders() },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response, `Share link invalid (${response.status})`));
  }

  return (await response.json()) as CloudApiSharedProjectInfo;
}

export async function importSharedProject(
  shareToken: string,
): Promise<{ projectId: string; projectName: string }> {
  const info = await fetchSharedProjectInfo(shareToken);

  const response = await fetch(
    `${getCloudApiBase()}/v1/shared/${encodeURIComponent(shareToken)}/archive`,
    { headers: authHeaders() },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response, `Import failed (${response.status})`));
  }

  const archive = await response.arrayBuffer();
  const localProjectId = crypto.randomUUID();
  const overrideName = `${info.projectName} (shared)`;

  const imported = await importProjectArchiveToDb(archive, {
    localProjectId,
    overrideName,
  });

  return {
    projectId: localProjectId,
    projectName: imported.projectName,
  };
}

export function readShareTokenFromUrl(): string | null {
  const token = new URLSearchParams(window.location.search).get('share')?.trim();
  return token || null;
}

export function clearShareTokenFromUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('share');
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
}
