import Dexie, { type Table } from 'dexie';
import type { ProjectData, StoredAsset, StoredProject } from '@js-game-engine/shared';

export class GameEngineDB extends Dexie {
  projects!: Table<StoredProject, string>;
  assets!: Table<StoredAsset, string>;

  constructor() {
    super('js-game-engine');
    this.version(1).stores({
      projects: 'id, name, updatedAt',
      assets: 'id, projectId, name, type',
    });
  }
}

export const db = new GameEngineDB();

export type { ProjectData, StoredAsset, StoredProject };
