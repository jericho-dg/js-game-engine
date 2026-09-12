import type { CloudApiGalleryResponse } from '@js-game-engine/shared';
import { isRemoteCloudEnabled } from './cloud/getCloudBackend';

function getCloudApiBase(): string {
  const apiUrl = import.meta.env.VITE_CLOUD_API_URL as string | undefined;
  if (!apiUrl) {
    throw new Error('The game gallery requires the remote cloud API.');
  }
  return apiUrl.replace(/\/$/, '');
}

export function canBrowseGameGallery(): boolean {
  return isRemoteCloudEnabled();
}

export async function fetchPublicGames(): Promise<CloudApiGalleryResponse['games']> {
  const response = await fetch(`${getCloudApiBase()}/v1/gallery`);
  if (!response.ok) {
    throw new Error(`Failed to load gallery (${response.status})`);
  }

  const body = (await response.json()) as CloudApiGalleryResponse;
  return body.games;
}

export function buildLocalPlayUrl(publishId: string): string {
  return `${window.location.origin.replace(/\/$/, '')}/play/${publishId}/`;
}
