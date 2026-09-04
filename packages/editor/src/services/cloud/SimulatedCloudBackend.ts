import type { CloudProjectSummary } from '@js-game-engine/shared';
import { db } from '../db';
import type { CloudBackend } from './types';

export class SimulatedCloudBackend implements CloudBackend {
  async syncProjectFromLocal(projectId: string, cloudId: string): Promise<void> {
    const stored = await db.projects.get(projectId);
    if (!stored) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const assets = await db.assets.where('projectId').equals(projectId).toArray();

    await db.cloudProjects.put({
      id: cloudId,
      name: stored.name,
      data: stored.data,
      updatedAt: stored.updatedAt,
    });

    await db.cloudAssets.where('cloudProjectId').equals(cloudId).delete();
    for (const asset of assets) {
      await db.cloudAssets.put({
        id: asset.id,
        cloudProjectId: cloudId,
        name: asset.name,
        type: asset.type,
        mimeType: asset.mimeType,
        width: asset.width,
        height: asset.height,
        blob: asset.blob,
      });
    }
  }

  async deleteProject(cloudProjectId: string): Promise<void> {
    await db.cloudAssets.where('cloudProjectId').equals(cloudProjectId).delete();
    await db.cloudProjects.delete(cloudProjectId);
  }

  async listProjects(): Promise<CloudProjectSummary[]> {
    const rows = await db.cloudProjects.orderBy('updatedAt').reverse().toArray();
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      updatedAt: row.updatedAt,
    }));
  }

  async importRemoteProject(cloudProjectId: string, localProjectId: string): Promise<void> {
    const cloud = await db.cloudProjects.get(cloudProjectId);
    if (!cloud) {
      throw new Error('Cloud project not found.');
    }

    const cloudAssets = await db.cloudAssets
      .where('cloudProjectId')
      .equals(cloudProjectId)
      .toArray();

    await db.assets.where('projectId').equals(localProjectId).delete();
    for (const asset of cloudAssets) {
      await db.assets.put({
        id: asset.id,
        projectId: localProjectId,
        name: asset.name,
        type: asset.type,
        mimeType: asset.mimeType,
        width: asset.width,
        height: asset.height,
        blob: asset.blob,
      });
    }

    const now = Date.now();
    await db.projects.put({
      id: localProjectId,
      name: cloud.name,
      data: cloud.data,
      updatedAt: cloud.updatedAt,
      cloudId: cloudProjectId,
      lastSyncedAt: now,
    });
  }
}
