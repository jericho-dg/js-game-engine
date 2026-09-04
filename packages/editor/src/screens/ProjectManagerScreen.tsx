import { useCallback, useEffect, useRef, useState } from 'react';
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
import { DeleteProjectDialog, type DeleteProjectScope } from '../components/DeleteProjectDialog';
import { AccountBar } from '../components/AccountBar';
import { SyncStatusBar } from '../components/SyncStatusBar';
import { useAccountStore } from '../stores/accountStore';
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

  const refreshProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProjects(await projectService.listProjects());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const isSignedIn = useAccountStore((s) => s.isSignedIn());
  const usesRemoteCloud = cloudSyncService.usesRemoteCloud();

  const showCloudDeleteOptions = usesRemoteCloud && isSignedIn;
  const remoteOnlyLocalDelete = usesRemoteCloud && !isSignedIn;

  const resyncFromCloud = useCallback(async () => {
    setLoading(true);
    setError(null);
    useCloudSyncStore.getState().refreshMode();
    try {
      if (cloudSyncService.canSync()) {
        await cloudSyncService.resyncAll();
      }
      await refreshProjects();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setLoading(false);
    }
  }, [refreshProjects, isSignedIn]);

  const retrySync = useCallback(async () => {
    setError(null);
    try {
      await cloudSyncService.retryPending();
      await refreshProjects();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  }, [refreshProjects]);

  useEffect(() => {
    void (async () => {
      if (usesRemoteCloud && useAccountStore.getState().token) {
        await useAccountStore.getState().validateSession();
      }
      await resyncFromCloud();
    })();
  }, [resyncFromCloud, usesRemoteCloud]);

  const deleteProject = async (project: ProjectSummary, scope: DeleteProjectScope) => {
    setBusyId(project.id);
    setError(null);
    try {
      await deleteProjectById(project.id, {
        deleteCloud: scope === 'everywhere',
      });
      await refreshProjects();
      setProjectToDelete(null);
      useConsoleStore.getState().log(
        'log',
        scope === 'everywhere'
          ? `Deleted project everywhere: ${project.name}`
          : `Removed project from this device: ${project.name}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setBusyId(null);
    }
  };

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

  return (
    <div className="flex h-full flex-col bg-[#1e1e1e]">
      <header className="border-b border-[#3c3c3c] bg-[#2d2d2d] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[#cccccc]">js-game-engine</h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-xs text-[#858585]">Project Manager</p>
              <SyncStatusBar onRetry={() => void retrySync()} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AccountBar />
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-[#858585]">
              Projects
            </h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => void resyncFromCloud()}
                className="rounded px-3 py-1.5 text-xs text-[#858585] transition-colors hover:bg-[#3c3c3c] hover:text-[#cccccc]"
              >
                Refresh
              </button>
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
                  onOpen={() => void openProject(project.id)}
                  onDelete={() => setProjectToDelete(project)}
                />
              ))}
            </div>
          )}

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
        showCloudOptions={showCloudDeleteOptions}
        remoteOnlyLocalDelete={remoteOnlyLocalDelete}
        isDeleting={projectToDelete !== null && busyId === projectToDelete.id}
        onClose={() => setProjectToDelete(null)}
        onConfirm={(scope) => {
          if (projectToDelete) void deleteProject(projectToDelete, scope);
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
  onOpen,
  onDelete,
}: {
  project: ProjectSummary;
  busy: boolean;
  disabled: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="flex flex-col rounded-lg border border-[#3c3c3c] bg-[#252526]">
      <div className="flex items-center gap-3 border-b border-[#3c3c3c] px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded bg-[#1a1a2e] text-xs font-semibold text-[#4fc3f7]">
          {project.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-[#cccccc]">{project.name}</h3>
          <p className="text-xs text-[#858585]">
            Modified {formatUpdatedAt(project.updatedAt)}
          </p>
        </div>
      </div>

      <div className="flex gap-2 px-4 py-3">
        <ActionButton
          label={busy ? 'Opening…' : 'Open'}
          primary
          disabled={disabled || busy}
          onClick={onOpen}
        />
        <ActionButton
          label="Delete"
          disabled={disabled || busy}
          onClick={onDelete}
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
