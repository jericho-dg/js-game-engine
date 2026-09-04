import type {
  CloudProjectSummary,
  ProjectSyncStatus,
} from '@js-game-engine/shared';
import { db } from './db';

function computeSyncStatus(
  localUpdatedAt: number,
  lastSyncedAt: number | undefined,
  cloudUpdatedAt: number | undefined,
): ProjectSyncStatus {
  if (!cloudUpdatedAt || !lastSyncedAt) return 'local';
  if (localUpdatedAt > lastSyncedAt) return 'pending';
  if (cloudUpdatedAt > lastSyncedAt) return 'behind';
  return 'synced';
}

export class CloudSyncService {
  async getSyncStatus(projectId: string): Promise<ProjectSyncStatus> {
    const stored = await db.projects.get(projectId);
    if (!stored?.cloudId) return 'local';

    const cloud = await db.cloudProjects.get(stored.cloudId);
    if (!cloud) return 'local';

    return computeSyncStatus(stored.updatedAt, stored.lastSyncedAt, cloud.updatedAt);
  }

  async listCloudProjects(): Promise<CloudProjectSummary[]> {
    const rows = await db.cloudProjects.orderBy('updatedAt').reverse().toArray();
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      updatedAt: row.updatedAt,
    }));
  }

  async listOrphanCloudProjects(): Promise<CloudProjectSummary[]> {
    const cloud = await this.listCloudProjects();
    const linked = new Set(
      (await db.projects.toArray())
        .map((project) => project.cloudId)
        .filter((id): id is string => Boolean(id)),
    );
    return cloud.filter((project) => !linked.has(project.id));
  }

  async pushProject(projectId: string): Promise<void> {
    const stored = await db.projects.get(projectId);
    if (!stored) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const cloudId = stored.cloudId ?? crypto.randomUUID();
    const now = Date.now();
    const assets = await db.assets.where('projectId').equals(projectId).toArray();

    await db.cloudProjects.put({
      id: cloudId,
      name: stored.name,
      data: stored.data,
      updatedAt: now,
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

    await db.projects.put({
      ...stored,
      cloudId,
      lastSyncedAt: now,
      updatedAt: stored.updatedAt,
    });
  }

  async pullProject(projectId: string): Promise<void> {
    const stored = await db.projects.get(projectId);
    if (!stored?.cloudId) {
      throw new Error('Project has not been pushed to the cloud yet.');
    }

    const cloud = await db.cloudProjects.get(stored.cloudId);
    if (!cloud) {
      throw new Error('Cloud copy not found.');
    }

    const cloudAssets = await db.cloudAssets
      .where('cloudProjectId')
      .equals(stored.cloudId)
      .toArray();

    await db.assets.where('projectId').equals(projectId).delete();
    for (const asset of cloudAssets) {
      await db.assets.put({
        id: asset.id,
        projectId,
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
      ...stored,
      name: cloud.name,
      data: cloud.data,
      updatedAt: cloud.updatedAt,
      lastSyncedAt: now,
    });
  }

  async importCloudProject(cloudProjectId: string): Promise<string> {
    const cloud = await db.cloudProjects.get(cloudProjectId);
    if (!cloud) {
      throw new Error('Cloud project not found.');
    }

    const localId = crypto.randomUUID();
    const cloudAssets = await db.cloudAssets
      .where('cloudProjectId')
      .equals(cloudProjectId)
      .toArray();
    const now = Date.now();

    await db.projects.put({
      id: localId,
      name: cloud.name,
      data: cloud.data,
      updatedAt: cloud.updatedAt,
      cloudId: cloudProjectId,
      lastSyncedAt: now,
    });

    for (const asset of cloudAssets) {
      await db.assets.put({
        id: asset.id,
        projectId: localId,
        name: asset.name,
        type: asset.type,
        mimeType: asset.mimeType,
        width: asset.width,
        height: asset.height,
        blob: asset.blob,
      });
    }

    return localId;
  }

  async deleteCloudProject(cloudProjectId: string): Promise<void> {
    await db.cloudAssets.where('cloudProjectId').equals(cloudProjectId).delete();
    await db.cloudProjects.delete(cloudProjectId);

    const linked = await db.projects.filter((p) => p.cloudId === cloudProjectId).toArray();
    for (const project of linked) {
      await db.projects.put({
        id: project.id,
        name: project.name,
        data: project.data,
        updatedAt: project.updatedAt,
      });
    }
  }
}

export const cloudSyncService = new CloudSyncService();

export { computeSyncStatus };
