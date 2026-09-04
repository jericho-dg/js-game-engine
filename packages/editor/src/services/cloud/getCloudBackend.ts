import type { CloudBackend } from './types';
import { HttpCloudBackend } from './HttpCloudBackend';
import { SimulatedCloudBackend } from './SimulatedCloudBackend';

let backend: CloudBackend | null = null;

export function getCloudBackend(): CloudBackend {
  if (backend) return backend;

  const apiUrl = import.meta.env.VITE_CLOUD_API_URL as string | undefined;
  backend = apiUrl ? new HttpCloudBackend(apiUrl.replace(/\/$/, '')) : new SimulatedCloudBackend();
  return backend;
}

export function isRemoteCloudEnabled(): boolean {
  return Boolean(import.meta.env.VITE_CLOUD_API_URL);
}
