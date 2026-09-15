import type { CloudBackend } from './types';
import { HttpCloudBackend } from './HttpCloudBackend';
import { SimulatedCloudBackend } from './SimulatedCloudBackend';
import { isRemoteCloudApiConfigured, resolveCloudApiBaseUrl } from './cloudApiUrl';

let backend: CloudBackend | null = null;

export function getCloudBackend(): CloudBackend {
  if (backend) return backend;

  const apiUrl = resolveCloudApiBaseUrl();
  backend = apiUrl ? new HttpCloudBackend(apiUrl) : new SimulatedCloudBackend();
  return backend;
}

export function isRemoteCloudEnabled(): boolean {
  return isRemoteCloudApiConfigured();
}
