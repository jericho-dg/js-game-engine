import type { CloudProjectSummary } from '@js-game-engine/shared';

export interface CloudBackend {
  syncProjectFromLocal(projectId: string, cloudId: string): Promise<void>;
  deleteProject(cloudId: string): Promise<void>;
  listProjects(): Promise<CloudProjectSummary[]>;
  importRemoteProject(cloudId: string, localProjectId: string): Promise<void>;
}
