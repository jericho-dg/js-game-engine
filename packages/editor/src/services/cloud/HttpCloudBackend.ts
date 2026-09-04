import type { CloudProjectSummary } from '@js-game-engine/shared';
import type { CloudApiProjectListResponse } from '@js-game-engine/shared';
import { importProjectArchiveToDb } from '../projectArchive';
import { useAccountStore } from '../../stores/accountStore';
import type { CloudBackend } from './types';

export class HttpCloudBackend implements CloudBackend {
  constructor(private readonly baseUrl: string) {}

  private headers(): HeadersInit {
    const { token } = useAccountStore.getState();
    if (!token) {
      throw new Error('Sign in is required for cloud sync.');
    }
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async syncProjectFromLocal(projectId: string, cloudId: string): Promise<void> {
    const { buildProjectArchiveFromDb } = await import('../projectArchive');
    const archive = await buildProjectArchiveFromDb(projectId);

    const response = await fetch(`${this.baseUrl}/v1/projects/${cloudId}`, {
      method: 'PUT',
      headers: {
        ...this.headers(),
        'Content-Type': 'application/zip',
      },
      body: archive,
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }
  }

  async deleteProject(cloudProjectId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/v1/projects/${cloudProjectId}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
    if (!response.ok) {
      throw new Error(await readError(response));
    }
  }

  async listProjects(): Promise<CloudProjectSummary[]> {
    const response = await fetch(`${this.baseUrl}/v1/projects`, {
      headers: this.headers(),
    });
    if (!response.ok) {
      throw new Error(await readError(response));
    }
    const body = (await response.json()) as CloudApiProjectListResponse;
    return body.projects;
  }

  async importRemoteProject(cloudProjectId: string, localProjectId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/v1/projects/${cloudProjectId}`, {
      headers: this.headers(),
    });
    if (!response.ok) {
      throw new Error(await readError(response));
    }
    const archive = await response.arrayBuffer();
    await importProjectArchiveToDb(archive, {
      localProjectId,
      cloudId: cloudProjectId,
    });
  }
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `Cloud API error (${response.status})`;
  } catch {
    return `Cloud API error (${response.status})`;
  }
}
