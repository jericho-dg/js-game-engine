import type { ProjectData } from './project';
import type { AssetType } from './project';

export interface CloudProjectRecord {
  id: string;
  name: string;
  data: ProjectData;
  updatedAt: number;
}

export interface CloudAssetRecord {
  id: string;
  cloudProjectId: string;
  name: string;
  type: AssetType;
  mimeType: string;
  width: number;
  height: number;
  blob: Blob;
}

export interface CloudProjectSummary {
  id: string;
  name: string;
  updatedAt: number;
}

/** A project changed both locally and in the cloud since the last sync. */
export interface SyncConflict {
  localProjectId: string;
  cloudProjectId: string;
  projectName: string;
  localUpdatedAt: number;
  cloudUpdatedAt: number;
}

export type SyncConflictResolution = 'local' | 'cloud' | 'both' | 'skip';
