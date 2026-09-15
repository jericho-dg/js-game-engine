import type { CloudApiErrorResponse, CloudApiPublishResponse } from '@js-game-engine/shared';
import type { Scene } from '@js-game-engine/engine';
import { useAccountStore } from '../stores/accountStore';
import { db } from './db';
import { isRemoteCloudEnabled } from './cloud/getCloudBackend';
import { resolveCloudApiBaseUrl } from './cloud/cloudApiUrl';
import { buildPublishedGamePlayUrl } from './playUrl';
import { buildStandaloneGameZip } from './standaloneExport';

function getCloudApiBase(): string {
  const apiUrl = resolveCloudApiBaseUrl();
  if (!apiUrl) {
    throw new Error('Publishing requires the remote cloud API.');
  }
  return apiUrl;
}

export function canPublishToCloud(): boolean {
  return isRemoteCloudEnabled() && useAccountStore.getState().isSignedIn();
}

export async function publishStandaloneGame(
  scene: Scene,
  projectId: string,
  projectName: string,
  options?: { listInGallery?: boolean },
): Promise<{ publishId: string; playUrl: string; isPublic: boolean }> {
  const token = useAccountStore.getState().token;
  if (!token) {
    throw new Error('Sign in to publish a game.');
  }

  const stored = await db.projects.get(projectId);
  const publishId = stored?.publishId ?? crypto.randomUUID();
  const blob = await buildStandaloneGameZip(scene, projectId, projectName);
  const listInGallery = options?.listInGallery ?? false;

  const params = new URLSearchParams();
  if (listInGallery) {
    params.set('public', 'true');
  }
  params.set('title', projectName);

  const response = await fetch(
    `${getCloudApiBase()}/v1/publish/${publishId}?${params.toString()}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/zip',
      },
      body: blob,
    },
  );

  if (!response.ok) {
    let message = `Publish failed (${response.status})`;
    try {
      const body = (await response.json()) as CloudApiErrorResponse;
      if (body.error) message = body.error;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  const result = (await response.json()) as CloudApiPublishResponse;

  if (stored && !stored.publishId) {
    await db.projects.put({ ...stored, publishId });
  }

  const playUrl = buildPublishedGamePlayUrl(publishId);
  return {
    publishId,
    playUrl: result.playUrl || playUrl,
    isPublic: result.isPublic,
  };
}
