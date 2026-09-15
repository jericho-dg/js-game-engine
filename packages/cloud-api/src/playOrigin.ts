import type { IncomingMessage } from 'node:http';

const PORT = Number(process.env.PORT ?? 8787);

function normalizePublicOrigin(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '');
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function configuredPlayOrigin(): string | null {
  const raw =
    process.env.PLAY_URL_ORIGIN?.trim() ||
    process.env.PUBLIC_API_URL?.trim() ||
    process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  return raw ? normalizePublicOrigin(raw) : null;
}

/**
 * Origin used in play links returned by the API.
 * Defaults to this service's public host (Railway) so /play works without a Vercel proxy.
 * Set PLAY_URL_ORIGIN to your editor URL when /play is rewritten to this API on Vercel.
 */
export function resolvePlayOrigin(req: IncomingMessage): string {
  const configured = configuredPlayOrigin();
  if (configured) {
    return configured;
  }

  const host = req.headers.host;
  if (host && !host.startsWith('localhost')) {
    const proto =
      req.headers['x-forwarded-proto'] === 'http' ? 'http' : 'https';
    return `${proto}://${host}`;
  }

  const origin = req.headers.origin;
  if (origin) {
    return origin.replace(/\/$/, '');
  }

  return `http://localhost:${PORT}`;
}
