import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface ShareRecord {
  token: string;
  ownerId: string;
  ownerDisplayName: string;
  projectId: string;
  projectName: string;
  createdAt: number;
  updatedAt: number;
}

interface ShareStore {
  byToken: Record<string, ShareRecord>;
  byProject: Record<string, string>;
}

function sharesPath(dataDir: string): string {
  return path.join(dataDir, 'shares.json');
}

function projectKey(ownerId: string, projectId: string): string {
  return `${ownerId}:${projectId}`;
}

async function readShareStore(dataDir: string): Promise<ShareStore> {
  try {
    const raw = await readFile(sharesPath(dataDir), 'utf8');
    const parsed = JSON.parse(raw) as ShareStore;
    return {
      byToken: parsed.byToken ?? {},
      byProject: parsed.byProject ?? {},
    };
  } catch {
    return { byToken: {}, byProject: {} };
  }
}

async function writeShareStore(dataDir: string, store: ShareStore): Promise<void> {
  await writeFile(sharesPath(dataDir), JSON.stringify(store, null, 2));
}

export async function createOrGetProjectShare(
  dataDir: string,
  ownerId: string,
  ownerDisplayName: string,
  projectId: string,
  projectName: string,
): Promise<ShareRecord> {
  const store = await readShareStore(dataDir);
  const existingToken = store.byProject[projectKey(ownerId, projectId)];
  const now = Date.now();

  if (existingToken) {
    const existing = store.byToken[existingToken];
    if (existing) {
      existing.projectName = projectName;
      existing.updatedAt = now;
      store.byToken[existingToken] = existing;
      await writeShareStore(dataDir, store);
      return existing;
    }
  }

  const token = randomUUID();
  const record: ShareRecord = {
    token,
    ownerId,
    ownerDisplayName,
    projectId,
    projectName,
    createdAt: now,
    updatedAt: now,
  };

  store.byToken[token] = record;
  store.byProject[projectKey(ownerId, projectId)] = token;
  await writeShareStore(dataDir, store);
  return record;
}

export async function getShareByToken(
  dataDir: string,
  token: string,
): Promise<ShareRecord | null> {
  const store = await readShareStore(dataDir);
  return store.byToken[token] ?? null;
}

export async function revokeProjectShare(
  dataDir: string,
  ownerId: string,
  projectId: string,
): Promise<boolean> {
  const store = await readShareStore(dataDir);
  const token = store.byProject[projectKey(ownerId, projectId)];
  if (!token) {
    return false;
  }

  delete store.byToken[token];
  delete store.byProject[projectKey(ownerId, projectId)];
  await writeShareStore(dataDir, store);
  return true;
}

export function buildShareUrl(origin: string, shareToken: string): string {
  const base = origin.replace(/\/$/, '');
  return `${base}/?share=${encodeURIComponent(shareToken)}`;
}
