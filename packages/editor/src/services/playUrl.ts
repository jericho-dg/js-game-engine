import { resolveCloudApiBaseUrl } from './cloud/cloudApiUrl';

/**
 * Play pages are served by the cloud API at /play/{id}/.
 * In dev, Vite proxies /play to the API; on Vercel use Railway play URLs or add a /play rewrite.
 */
export function buildPublishedGamePlayUrl(publishId: string): string {
  const apiBase = resolveCloudApiBaseUrl();
  if (!apiBase) {
    throw new Error('Play URL requires the remote cloud API.');
  }

  const path = `/play/${publishId}`;

  if (apiBase.startsWith('/')) {
    return `${window.location.origin.replace(/\/$/, '')}${path}`;
  }

  return `${apiBase.replace(/\/$/, '')}${path}`;
}
