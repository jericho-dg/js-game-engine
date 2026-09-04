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
