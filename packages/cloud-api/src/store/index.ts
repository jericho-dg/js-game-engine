import { getCloudStoreBackend, getFileDataDir } from '../config.js';
import { createFileStore, ensureFileDataDir } from './fileStore.js';
import { createSupabaseStore } from './supabaseStore.js';
import type { CloudStore } from './types.js';

let store: CloudStore | null = null;

export function getCloudStore(): CloudStore {
  if (!store) {
    store =
      getCloudStoreBackend() === 'supabase'
        ? createSupabaseStore()
        : createFileStore(getFileDataDir());
  }
  return store;
}

export async function initializeCloudStore(): Promise<void> {
  if (getCloudStoreBackend() === 'file') {
    await ensureFileDataDir(getFileDataDir());
  }
  getCloudStore();
}

export type { CloudStore, AuthUser, AuthResult, ProjectIndexEntry, ShareRecord } from './types.js';
