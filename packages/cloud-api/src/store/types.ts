import type {
  GalleryGameEntry,
  PublishGameOptions,
  StorePublishedGameResult,
} from './publishTypes.js';

export type { GalleryGameEntry, PublishGameOptions, StorePublishedGameResult } from './publishTypes.js';

export interface AuthUser {
  userId: string;
  displayName: string;
}

export interface AuthResult {
  token: string;
  userId: string;
  displayName: string;
}

export interface ProjectIndexEntry {
  id: string;
  name: string;
  updatedAt: number;
}

export interface ShareRecord {
  token: string;
  ownerId: string;
  ownerDisplayName: string;
  projectId: string;
  projectName: string;
  createdAt: number;
  updatedAt: number;
}

export interface CloudStore {
  signUp(displayName: string, password: string): Promise<AuthResult>;
  signIn(displayName: string, password: string): Promise<AuthResult>;
  signOut(token: string): Promise<void>;
  authenticateToken(token: string | undefined): Promise<AuthUser | null>;

  listProjects(userId: string): Promise<ProjectIndexEntry[]>;
  getProjectArchive(userId: string, projectId: string): Promise<Buffer | null>;
  putProjectArchive(
    userId: string,
    projectId: string,
    archive: Buffer,
    meta: { name: string; updatedAt: number },
  ): Promise<void>;
  deleteProject(userId: string, projectId: string): Promise<void>;

  createOrGetProjectShare(
    ownerId: string,
    ownerDisplayName: string,
    projectId: string,
    projectName: string,
  ): Promise<ShareRecord>;
  getShareByToken(token: string): Promise<ShareRecord | null>;
  revokeProjectShare(ownerId: string, projectId: string): Promise<boolean>;

  storePublishedGame(
    publishId: string,
    archive: Buffer,
    options?: PublishGameOptions,
  ): Promise<StorePublishedGameResult>;
  listPublicGames(limit?: number): Promise<GalleryGameEntry[]>;
  readPublishedFile(
    publishId: string,
    requestPath: string,
  ): Promise<{ buffer: Buffer; mimeType: string } | null>;
}
