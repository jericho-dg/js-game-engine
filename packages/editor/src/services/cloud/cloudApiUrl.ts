/**
 * Resolves VITE_CLOUD_API_URL for fetch().
 * - `/cloud-api` → relative (Vite / Vercel proxy in dev or with rewrites)
 * - `https://...` → absolute
 * - `host.up.railway.app` → `https://host...` (common deploy misconfiguration)
 */
export function resolveCloudApiBaseUrl(): string | null {
  const raw = import.meta.env.VITE_CLOUD_API_URL?.trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/\/$/, '');
  }

  if (raw.startsWith('/')) {
    return raw.replace(/\/$/, '');
  }

  return `https://${raw.replace(/\/$/, '')}`;
}

export function isRemoteCloudApiConfigured(): boolean {
  return resolveCloudApiBaseUrl() !== null;
}
