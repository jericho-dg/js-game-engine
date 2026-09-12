import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import {
  authenticateToken as authenticateTokenFromFile,
  signIn as signInFromFile,
  signOut as signOutFromFile,
  signUp as signUpFromFile,
} from '../auth.js';
import {
  createOrGetProjectShare as createShareFromFile,
  getShareByToken as getShareFromFile,
  revokeProjectShare as revokeShareFromFile,
} from '../shares.js';
import {
  listPublicGames as listPublicGamesFromFile,
  readPublishedFile as readPublishedFromFile,
  storePublishedGame as storePublishedFromFile,
} from '../publish.js';
import type { CloudStore, ProjectIndexEntry } from './types.js';

interface UserIndex {
  projects: ProjectIndexEntry[];
}

function resolveDataDir(dataDir: string): string {
  if (dataDir) return dataDir;
  return path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../.cloud-data',
  );
}

function userDir(dataDir: string, userId: string): string {
  return path.join(dataDir, userId);
}

function projectPath(dataDir: string, userId: string, projectId: string): string {
  return path.join(userDir(dataDir, userId), `${projectId}.jge.zip`);
}

async function readUserIndex(dataDir: string, userId: string): Promise<UserIndex> {
  try {
    const raw = await readFile(path.join(userDir(dataDir, userId), 'index.json'), 'utf8');
    return JSON.parse(raw) as UserIndex;
  } catch {
    return { projects: [] };
  }
}

async function writeUserIndex(
  dataDir: string,
  userId: string,
  index: UserIndex,
): Promise<void> {
  const dir = userDir(dataDir, userId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.json'), JSON.stringify(index, null, 2));
}

export function createFileStore(dataDirOverride = ''): CloudStore {
  const dataDir = resolveDataDir(dataDirOverride);

  return {
    signUp: (displayName, password) => signUpFromFile(dataDir, displayName, password),
    signIn: (displayName, password) => signInFromFile(dataDir, displayName, password),
    signOut: (token) => signOutFromFile(dataDir, token),
    authenticateToken: (token) => authenticateTokenFromFile(dataDir, token),

    async listProjects(userId) {
      const index = await readUserIndex(dataDir, userId);
      return index.projects;
    },

    async getProjectArchive(userId, projectId) {
      try {
        return await readFile(projectPath(dataDir, userId, projectId));
      } catch {
        return null;
      }
    },

    async putProjectArchive(userId, projectId, archive, meta) {
      await mkdir(userDir(dataDir, userId), { recursive: true });
      await writeFile(projectPath(dataDir, userId, projectId), archive);

      const index = await readUserIndex(dataDir, userId);
      const nextEntry: ProjectIndexEntry = {
        id: projectId,
        name: meta.name,
        updatedAt: meta.updatedAt,
      };
      index.projects = [
        nextEntry,
        ...index.projects.filter((entry) => entry.id !== projectId),
      ];
      await writeUserIndex(dataDir, userId, index);
    },

    async deleteProject(userId, projectId) {
      await rm(projectPath(dataDir, userId, projectId), { force: true });
      await revokeShareFromFile(dataDir, userId, projectId);
      const index = await readUserIndex(dataDir, userId);
      index.projects = index.projects.filter((entry) => entry.id !== projectId);
      await writeUserIndex(dataDir, userId, index);
    },

    createOrGetProjectShare: (ownerId, ownerDisplayName, projectId, projectName) =>
      createShareFromFile(dataDir, ownerId, ownerDisplayName, projectId, projectName),
    getShareByToken: (token) => getShareFromFile(dataDir, token),
    revokeProjectShare: (ownerId, projectId) =>
      revokeShareFromFile(dataDir, ownerId, projectId),

    storePublishedGame: (publishId, archive, options) =>
      storePublishedFromFile(dataDir, publishId, archive, options),
    listPublicGames: (limit) => listPublicGamesFromFile(dataDir, limit),
    readPublishedFile: (publishId, requestPath) =>
      readPublishedFromFile(dataDir, publishId, requestPath),
  };
}

export async function ensureFileDataDir(dataDirOverride = ''): Promise<string> {
  const dataDir = resolveDataDir(dataDirOverride);
  await mkdir(dataDir, { recursive: true });
  return dataDir;
}
