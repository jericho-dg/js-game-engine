import { useCallback, useEffect, useRef, useState } from 'react';
import type { CloudProjectSummary } from '@js-game-engine/shared';
import type { ProjectSummary } from '../services/ProjectService';
import { projectService } from '../services/ProjectService';
import { cloudSyncService } from '../services/cloudSyncService';
import {
  createAndOpenProject,
  deleteProjectById,
  importAndOpenProject,
  loadProjectIntoEditor,
} from '../services/projectLoader';
import { NewProjectDialog } from '../components/NewProjectDialog';
import { DeleteProjectDialog } from '../components/DeleteProjectDialog';
import { CloudAccountBar, SyncStatusBadge } from '../components/CloudAccountBar';
import { useCloudSyncStore } from '../stores/cloudSyncStore';
import { useConsoleStore } from '../stores/consoleStore';

export function ProjectManagerScreen() {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cloudProjects, setCloudProjects] = useState<CloudProjectSummary[]>([]);
  const [orphanCloudProjects, setOrphanCloudProjects] = useState<CloudProjectSummary[]>([]);
  const isConnected = useCloudSyncStore((s) => s.isConnected);

  const refreshProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProjects(await projectService.listProjects());
      if (useCloudSyncStore.getState().isConnected) {
        setCloudProjects(await cloudSyncService.listCloudProjects());
        setOrphanCloudProjects(await cloudSyncService.listOrphanCloudProjects());
      } else {
        setCloudProjects([]);
        setOrphanCloudProjects([]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  const openProject = async (projectId: string) => {
    setBusyId(projectId);
    setError(null);
    try {
      await loadProjectIntoEditor(projectId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setBusyId(null);
    }
  };

  const deleteProject = async (project: ProjectSummary) => {
    setBusyId(project.id);
    setError(null);
    try {
      await deleteProjectById(project.id);
      await refreshProjects();
      setProjectToDelete(null);
      useConsoleStore.getState().log('log', `Deleted project: ${project.name}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setBusyId(null);
    }
  };

  const importProject = async (file: File) => {
    setBusyId('import');
    setError(null);
    try {
      await importAndOpenProject(file);
      useConsoleStore.getState().log('log', `Imported ${file.name}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setBusyId(null);
    }
  };

  const pushProject = async (project: ProjectSummary) => {
    setBusyId(project.id);
    setError(null);
    try {
      await cloudSyncService.pushProject(project.id);
      await refreshProjects();
      useConsoleStore.getState().log('log', `Pushed "${project.name}" to cloud.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setBusyId(null);
    }
  };

  const pullProject = async (project: ProjectSummary) => {
    setBusyId(project.id);
    setError(null);
    try {
      await cloudSyncService.pullProject(project.id);
      await refreshProjects();
      useConsoleStore.getState().log('log', `Pulled "${project.name}" from cloud.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setBusyId(null);
    }
  };

  const importFromCloud = async (cloudProject: CloudProjectSummary) => {
    setBusyId(cloudProject.id);
    setError(null);
    try {
      const localId = await cloudSyncService.importCloudProject(cloudProject.id);
      await refreshProjects();
      await loadProjectIntoEditor(localId);
      useConsoleStore.getState().log('log', `Imported "${cloudProject.name}" from cloud.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#1e1e1e]">
      <header className="border-b border-[#3c3c3c] bg-[#2d2d2d] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[#cccccc]">js-game-engine</h1>
            <p className="mt-0.5 text-xs text-[#858585]">Project Manager</p>
          </div>
          <div className="flex items-center gap-2">
            <CloudAccountBar onSyncChange={() => void refreshProjects()} />
            <ActionButton
              label="New Project"
              primary
              onClick={() => setIsNewDialogOpen(true)}
              disabled={busyId !== null}
            />
            <ActionButton
              label="Import"
              onClick={() => importInputRef.current?.click()}
              disabled={busyId !== null}
            />
            <input
              ref={importInputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void importProject(file);
              }}
            />
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wide text-[#858585]">
              Projects
            </h2>
            <button
              type="button"
              onClick={() => void refreshProjects()}
              className="text-xs text-[#858585] transition-colors hover:text-[#cccccc]"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-[#858585]">Loading projects…</p>
          ) : projects.length === 0 ? (
            <EmptyState onNewProject={() => setIsNewDialogOpen(true)} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  busy={busyId === project.id}
                  disabled={busyId !== null && busyId !== project.id}
                  showSync={isConnected}
                  onOpen={() => void openProject(project.id)}
                  onDelete={() => setProjectToDelete(project)}
                  onPush={() => void pushProject(project)}
                  onPull={() => void pullProject(project)}
                />
              ))}
            </div>
          )}

          {isConnected && orphanCloudProjects.length > 0 ? (
            <div className="mt-8">
              <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-[#858585]">
                Cloud Library
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {orphanCloudProjects.map((cloudProject) => (
                  <CloudProjectCard
                    key={cloudProject.id}
                    project={cloudProject}
                    busy={busyId === cloudProject.id}
                    disabled={busyId !== null && busyId !== cloudProject.id}
                    onImport={() => void importFromCloud(cloudProject)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {isConnected && cloudProjects.length === 0 && projects.length > 0 ? (
            <p className="mt-6 text-xs text-[#858585]">
              Push a local project to cloud to back it up or open it on another device.
            </p>
          ) : null}

          {error ? (
            <p className="mt-4 rounded border border-[#5a1d1d] bg-[#3a1f1f] px-3 py-2 text-xs text-[#f48771]">
              {error}
            </p>
          ) : null}
        </div>
      </main>

      <NewProjectDialog
        open={isNewDialogOpen}
        onClose={() => setIsNewDialogOpen(false)}
        onCreate={async (template, name) => {
          await createAndOpenProject(template, name);
        }}
      />

      <DeleteProjectDialog
        project={projectToDelete}
        isDeleting={projectToDelete !== null && busyId === projectToDelete.id}
        onClose={() => setProjectToDelete(null)}
        onConfirm={() => {
          if (projectToDelete) void deleteProject(projectToDelete);
        }}
      />
    </div>
  );
}

function EmptyState({ onNewProject }: { onNewProject: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-[#3c3c3c] bg-[#252526] px-6 py-10 text-center">
      <h3 className="text-base text-[#cccccc]">No projects yet</h3>
      <p className="mt-2 text-sm text-[#858585]">
        Create a new project or import a `.jge.zip` archive.
      </p>
      <button
        type="button"
        onClick={onNewProject}
        className="mt-5 rounded bg-[#007acc] px-4 py-2 text-sm text-white transition-colors hover:bg-[#1a8ad4]"
      >
        New Project
      </button>
    </div>
  );
}

function ProjectCard({
  project,
  busy,
  disabled,
  showSync,
  onOpen,
  onDelete,
  onPush,
  onPull,
}: {
  project: ProjectSummary;
  busy: boolean;
  disabled: boolean;
  showSync: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onPush: () => void;
  onPull: () => void;
}) {
  return (
    <article className="flex flex-col rounded-lg border border-[#3c3c3c] bg-[#252526]">
      <div className="flex items-center gap-3 border-b border-[#3c3c3c] px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded bg-[#1a1a2e] text-xs font-semibold text-[#4fc3f7]">
          {project.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-medium text-[#cccccc]">{project.name}</h3>
            {showSync && project.syncStatus ? (
              <SyncStatusBadge status={project.syncStatus} />
            ) : null}
          </div>
          <p className="text-xs text-[#858585]">
            Modified {formatUpdatedAt(project.updatedAt)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-4 py-3">
        <ActionButton
          label={busy ? 'Opening…' : 'Open'}
          primary
          disabled={disabled || busy}
          onClick={onOpen}
        />
        {showSync && project.syncStatus === 'pending' ? (
          <ActionButton label="Push" disabled={disabled || busy} onClick={onPush} />
        ) : null}
        {showSync && project.syncStatus === 'behind' ? (
          <ActionButton label="Pull" disabled={disabled || busy} onClick={onPull} />
        ) : null}
        {showSync && project.syncStatus === 'local' ? (
          <ActionButton label="Push" disabled={disabled || busy} onClick={onPush} />
        ) : null}
        <ActionButton
          label="Delete"
          disabled={disabled || busy}
          onClick={onDelete}
        />
      </div>
    </article>
  );
}

function CloudProjectCard({
  project,
  busy,
  disabled,
  onImport,
}: {
  project: CloudProjectSummary;
  busy: boolean;
  disabled: boolean;
  onImport: () => void;
}) {
  return (
    <article className="flex flex-col rounded-lg border border-[#3c3c3c] bg-[#252526]">
      <div className="flex items-center gap-3 border-b border-[#3c3c3c] px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded bg-[#1a3557] text-xs font-semibold text-[#64b5f6]">
          ☁
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-[#cccccc]">{project.name}</h3>
          <p className="text-xs text-[#858585]">
            Cloud · {formatUpdatedAt(project.updatedAt)}
          </p>
        </div>
      </div>
      <div className="flex gap-2 px-4 py-3">
        <ActionButton
          label={busy ? 'Importing…' : 'Import'}
          primary
          disabled={disabled || busy}
          onClick={onImport}
        />
      </div>
    </article>
  );
}

function ActionButton({
  label,
  onClick,
  primary,
  disabled,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded px-3 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        primary
          ? 'bg-[#007acc] text-white hover:bg-[#1a8ad4]'
          : 'border border-[#3c3c3c] text-[#cccccc] hover:bg-[#3c3c3c]'
      }`}
    >
      {label}
    </button>
  );
}

function formatUpdatedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
