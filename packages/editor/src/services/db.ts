import Dexie, { type Table } from 'dexie';
import type {
  CloudAssetRecord,
  CloudProjectRecord,
  ProjectData,
  StoredAsset,
  StoredProject,
} from '@js-game-engine/shared';

export class GameEngineDB extends Dexie {
  projects!: Table<StoredProject, string>;
  assets!: Table<StoredAsset, string>;
  cloudProjects!: Table<CloudProjectRecord, string>;
  cloudAssets!: Table<CloudAssetRecord, string>;

  constructor() {
    super('js-game-engine');
    this.version(1).stores({
      projects: 'id, name, updatedAt',
      assets: 'id, projectId, name, type',
    });
    this.version(2).stores({
      projects: 'id, name, updatedAt, cloudId',
      assets: 'id, projectId, name, type',
      cloudProjects: 'id, name, updatedAt',
      cloudAssets: 'id, cloudProjectId, name, type',
    });
  }
}

export const db = new GameEngineDB();

export type { ProjectData, StoredAsset, StoredProject };
