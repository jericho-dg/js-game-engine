import type { CloudProjectSummary } from '@js-game-engine/shared';
import { getCloudBackend, isRemoteCloudEnabled } from './cloud/getCloudBackend';
import { useAccountStore } from '../stores/accountStore';
import { useCloudSyncStore } from '../stores/cloudSyncStore';
import { db } from './db';

function isCloudSyncAvailable(): boolean {
  if (!isRemoteCloudEnabled()) return true;
  return useAccountStore.getState().isSignedIn();
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('network') || message.includes('fetch');
  }
  return false;
}

function syncErrorMessage(error: unknown): string {
  if (isNetworkError(error)) {
    return 'Cloud sync unavailable. Changes are saved locally and will retry when you refresh or sign in.';
  }
  return error instanceof Error ? error.message : String(error);
}

export class CloudSyncService {
  private resyncPromise: Promise<void> | null = null;
  private flushPromise: Promise<void> | null = null;
  private pendingProjectIds = new Set<string>();

  canSync(): boolean {
    return isCloudSyncAvailable();
  }

  getMode(): 'simulated' | 'remote' {
    return isRemoteCloudEnabled() ? 'remote' : 'simulated';
  }

  usesRemoteCloud(): boolean {
    return isRemoteCloudEnabled();
  }

  getPendingCount(): number {
    return this.pendingProjectIds.size;
  }

  private updateSyncAvailabilityState(): void {
    useCloudSyncStore.getState().refreshMode();
  }

  private updatePendingState(errorMessage: string | null = null): void {
    const count = this.pendingProjectIds.size;
    if (count > 0) {
      useCloudSyncStore.getState().setPending(
        count,
        errorMessage ??
          `${count} project${count === 1 ? '' : 's'} waiting to sync.`,
      );
    } else if (!errorMessage) {
      const store = useCloudSyncStore.getState();
      if (store.status !== 'syncing') {
        useCloudSyncStore.getState().clearError();
      }
    }
  }

  async syncProject(
    projectId: string,
    options?: { background?: boolean },
  ): Promise<void> {
    if (!isCloudSyncAvailable()) {
      this.updateSyncAvailabilityState();
      return;
    }

    useCloudSyncStore.getState().setSyncing();
    try {
      await this.pushProjectToCloud(projectId);
      this.pendingProjectIds.delete(projectId);
      useCloudSyncStore.getState().setSynced();
      this.updatePendingState();
    } catch (error) {
      this.pendingProjectIds.add(projectId);
      const message = syncErrorMessage(error);
      useCloudSyncStore.getState().setError(message, this.pendingProjectIds.size);
      if (!options?.background) {
        throw new Error(message);
      }
    }
  }

  private async pushProjectToCloud(projectId: string): Promise<void> {
    const stored = await db.projects.get(projectId);
    if (!stored) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const cloudId = stored.cloudId ?? crypto.randomUUID();
    const now = Date.now();

    await getCloudBackend().syncProjectFromLocal(projectId, cloudId);

    await db.projects.put({
      ...stored,
      cloudId,
      lastSyncedAt: now,
    });
  }

  async flushPending(): Promise<void> {
    if (!isCloudSyncAvailable() || this.pendingProjectIds.size === 0) {
      this.updateSyncAvailabilityState();
      return;
    }

    if (this.flushPromise) {
      return this.flushPromise;
    }

    this.flushPromise = this.runFlushPending().finally(() => {
      this.flushPromise = null;
    });

    return this.flushPromise;
  }

  private async runFlushPending(): Promise<void> {
    useCloudSyncStore.getState().setSyncing();
    const projectIds = [...this.pendingProjectIds];
    let lastError: string | null = null;

    for (const projectId of projectIds) {
      try {
        await this.pushProjectToCloud(projectId);
        this.pendingProjectIds.delete(projectId);
      } catch (error) {
        lastError = syncErrorMessage(error);
      }
    }

    if (this.pendingProjectIds.size === 0) {
      useCloudSyncStore.getState().setSynced();
      return;
    }

    useCloudSyncStore.getState().setError(
      lastError ?? 'Some projects could not be synced.',
      this.pendingProjectIds.size,
    );
  }

  async retryPending(): Promise<void> {
    useCloudSyncStore.getState().clearError();
    await this.flushPending();
    if (this.pendingProjectIds.size === 0) {
      await this.resyncAll();
    }
  }

  async resyncAll(): Promise<void> {
    if (!isCloudSyncAvailable()) {
      this.updateSyncAvailabilityState();
      return;
    }

    if (this.resyncPromise) {
      return this.resyncPromise;
    }

    this.resyncPromise = this.runResyncAll().finally(() => {
      this.resyncPromise = null;
    });

    return this.resyncPromise;
  }

  private async runResyncAll(): Promise<void> {
    useCloudSyncStore.getState().setSyncing();

    try {
      await this.flushPending();

      const backend = getCloudBackend();
      const cloudProjects = await backend.listProjects();
      const cloudById = new Map(cloudProjects.map((project) => [project.id, project]));
      const localProjects = await db.projects.toArray();

      for (const local of localProjects) {
        const cloudId = local.cloudId;

        if (!cloudId) {
          await this.syncProject(local.id, { background: true });
          continue;
        }

        const cloudSummary = cloudById.get(cloudId);
        if (!cloudSummary) {
          await this.deleteLocalProject(local.id);
          continue;
        }

        try {
          if (cloudSummary.updatedAt > local.updatedAt) {
            await backend.importRemoteProject(cloudId, local.id);
            const now = Date.now();
            const refreshed = await db.projects.get(local.id);
            if (refreshed) {
              await db.projects.put({
                ...refreshed,
                lastSyncedAt: now,
              });
            }
          } else if (local.updatedAt > cloudSummary.updatedAt) {
            await this.syncProject(local.id, { background: true });
          } else {
            const now = Date.now();
            await db.projects.put({
              ...local,
              lastSyncedAt: now,
            });
          }
        } catch (error) {
          this.pendingProjectIds.add(local.id);
          useCloudSyncStore.getState().setError(
            syncErrorMessage(error),
            this.pendingProjectIds.size,
          );
        }

        cloudById.delete(cloudId);
      }

      for (const cloudProject of cloudById.values()) {
        try {
          await this.importCloudProject(cloudProject.id);
        } catch (error) {
          useCloudSyncStore.getState().setError(
            syncErrorMessage(error),
            this.pendingProjectIds.size,
          );
        }
      }

      if (this.pendingProjectIds.size > 0) {
        this.updatePendingState();
      } else {
        useCloudSyncStore.getState().setSynced();
      }
    } catch (error) {
      const message = syncErrorMessage(error);
      useCloudSyncStore.getState().setError(message, this.pendingProjectIds.size);
      throw new Error(message);
    }
  }

  async importCloudProject(cloudProjectId: string): Promise<string> {
    const existing = await db.projects
      .filter((project) => project.cloudId === cloudProjectId)
      .first();
    if (existing) return existing.id;

    const localId = crypto.randomUUID();
    await getCloudBackend().importRemoteProject(cloudProjectId, localId);
    return localId;
  }

  async deleteCloudCopy(projectId: string): Promise<void> {
    if (!isCloudSyncAvailable()) return;

    const stored = await db.projects.get(projectId);
    if (!stored?.cloudId) return;
    await this.deleteCloudProject(stored.cloudId);
  }

  async deleteCloudProject(cloudProjectId: string): Promise<void> {
    await getCloudBackend().deleteProject(cloudProjectId);

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

  async listCloudProjects(): Promise<CloudProjectSummary[]> {
    return getCloudBackend().listProjects();
  }

  private async deleteLocalProject(projectId: string): Promise<void> {
    await db.assets.where('projectId').equals(projectId).delete();
    await db.projects.delete(projectId);
  }
}

export const cloudSyncService = new CloudSyncService();
