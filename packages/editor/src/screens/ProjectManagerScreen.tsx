import { useCallback, useEffect, useRef, useState } from 'react';
import type { SyncConflictResolution } from '@js-game-engine/shared';
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
import { SyncConflictDialog } from '../components/SyncConflictDialog';
import { ShareProjectDialog } from '../components/ShareProjectDialog';
import { AcceptSharedProjectDialog } from '../components/AcceptSharedProjectDialog';
import { GameGallery } from '../components/GameGallery';
import { useAccountStore } from '../stores/accountStore';
import { useCloudSyncStore } from '../stores/cloudSyncStore';
import { useConsoleStore } from '../stores/consoleStore';
import {
  canShareProjects,
  clearShareTokenFromUrl,
  createProjectShareLink,
  fetchSharedProjectInfo,
  importSharedProject,
  readShareTokenFromUrl,
} from '../services/shareService';
import type { CloudApiGalleryGame, CloudApiSharedProjectInfo } from '@js-game-engine/shared';
import {
  canBrowseGameGallery,
  fetchPublicGames,
} from '../services/galleryService';

export function ProjectManagerScreen() {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isResolvingConflict, setIsResolvingConflict] = useState(false);
  const [projectToShare, setProjectToShare] = useState<ProjectSummary | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [sharedProjectInfo, setSharedProjectInfo] = useState<CloudApiSharedProjectInfo | null>(null);
  const [shareAcceptLoading, setShareAcceptLoading] = useState(false);
  const [shareAcceptError, setShareAcceptError] = useState<string | null>(null);
  const [isImportingShare, setIsImportingShare] = useState(false);
  const pendingShareTokenRef = useRef<string | null>(null);
  const [managerTab, setManagerTab] = useState<'projects' | 'gallery'>('projects');
  const [galleryGames, setGalleryGames] = useState<CloudApiGalleryGame[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);

  const conflicts = useCloudSyncStore((s) => s.conflicts);
  const activeConflict = conflicts[0] ?? null;
  const conflictProjectIds = new Set(conflicts.map((c) => c.localProjectId));

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
  const showShareOption = canShareProjects();
  const showGallery = canBrowseGameGallery();

  const refreshGallery = useCallback(async () => {
    if (!showGallery) return;
    setGalleryLoading(true);
    setGalleryError(null);
    try {
      setGalleryGames(await fetchPublicGames());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setGalleryError(message);
    } finally {
      setGalleryLoading(false);
    }
  }, [showGallery]);

  const dismissShareAccept = useCallback(() => {
    setSharedProjectInfo(null);
    setShareAcceptError(null);
    setShareAcceptLoading(false);
    pendingShareTokenRef.current = null;
    clearShareTokenFromUrl();
  }, []);

  const loadPendingShare = useCallback(async (shareToken: string) => {
    pendingShareTokenRef.current = shareToken;
    setShareAcceptLoading(true);
    setShareAcceptError(null);
    setSharedProjectInfo(null);

    if (!canShareProjects()) {
      setShareAcceptLoading(false);
      setShareAcceptError('Sign in to import this shared project.');
      return;
    }

    try {
      const info = await fetchSharedProjectInfo(shareToken);
      setSharedProjectInfo(info);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setShareAcceptError(message);
    } finally {
      setShareAcceptLoading(false);
    }
  }, []);

  const importPendingShare = async () => {
    const shareToken = pendingShareTokenRef.current ?? readShareTokenFromUrl();
    if (!shareToken) return;

    setIsImportingShare(true);
    setError(null);
    try {
      const imported = await importSharedProject(shareToken);
      dismissShareAccept();
      await refreshProjects();
      useConsoleStore.getState().log('log', `Imported shared project: ${imported.projectName}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setShareAcceptError(message);
    } finally {
      setIsImportingShare(false);
    }
  };

  const startShare = async (project: ProjectSummary) => {
    setProjectToShare(project);
    setShareUrl(null);
    setIsSharing(true);
    setError(null);
    try {
      const share = await createProjectShareLink(project.id);
      setShareUrl(share.shareUrl);
      setIsSharing(false);
      useConsoleStore.getState().log('log', `Share link created for ${share.projectName}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setProjectToShare(null);
      setIsSharing(false);
    }
  };

  const closeShareDialog = () => {
    setProjectToShare(null);
    setShareUrl(null);
    setIsSharing(false);
  };

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

  const resolveConflict = async (resolution: SyncConflictResolution) => {
    if (!activeConflict) return;
    setIsResolvingConflict(true);
    setError(null);
    try {
      await cloudSyncService.resolveConflict(activeConflict, resolution);
      await refreshProjects();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsResolvingConflict(false);
    }
  };

  useEffect(() => {
    void (async () => {
      if (usesRemoteCloud && useAccountStore.getState().token) {
        await useAccountStore.getState().validateSession();
      }
      await resyncFromCloud();
    })();
  }, [resyncFromCloud, usesRemoteCloud]);

  useEffect(() => {
    const shareToken = readShareTokenFromUrl();
    if (!shareToken || !usesRemoteCloud) return;
    void loadPendingShare(shareToken);
  }, [loadPendingShare, usesRemoteCloud, isSignedIn]);

  useEffect(() => {
    if (managerTab === 'gallery') {
      void refreshGallery();
    }
  }, [managerTab, refreshGallery]);

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
            <div className="mt-0.5">
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
          {showGallery ? (
            <div className="mb-4 flex gap-2">
              <ManagerTabButton
                label="Projects"
                active={managerTab === 'projects'}
                onClick={() => setManagerTab('projects')}
              />
              <ManagerTabButton
                label="Game Gallery"
                active={managerTab === 'gallery'}
                onClick={() => setManagerTab('gallery')}
              />
            </div>
          ) : null}

          {managerTab === 'gallery' && showGallery ? (
            <GameGallery
              games={galleryGames}
              loading={galleryLoading}
              error={galleryError}
              onRefresh={() => void refreshGallery()}
            />
          ) : (
            <>
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
                  hasConflict={conflictProjectIds.has(project.id)}
                  busy={busyId === project.id}
                  disabled={busyId !== null && busyId !== project.id}
                  showShare={showShareOption}
                  onOpen={() => void openProject(project.id)}
                  onShare={() => void startShare(project)}
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
            </>
          )}
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

      <SyncConflictDialog
        conflict={activeConflict}
        isResolving={isResolvingConflict}
        onResolve={(resolution) => void resolveConflict(resolution)}
      />

      <ShareProjectDialog
        projectName={projectToShare?.name ?? null}
        shareUrl={shareUrl}
        isSharing={isSharing && !shareUrl}
        onClose={closeShareDialog}
      />

      <AcceptSharedProjectDialog
        info={sharedProjectInfo}
        isLoading={shareAcceptLoading}
        isImporting={isImportingShare}
        error={shareAcceptError}
        onImport={() => void importPendingShare()}
        onDismiss={dismissShareAccept}
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
  hasConflict,
  busy,
  disabled,
  showShare,
  onOpen,
  onShare,
  onDelete,
}: {
  project: ProjectSummary;
  hasConflict: boolean;
  busy: boolean;
  disabled: boolean;
  showShare: boolean;
  onOpen: () => void;
  onShare: () => void;
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
            {hasConflict ? (
              <span className="ml-2 text-[#dcdcaa]">· Sync conflict</span>
            ) : null}
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
        {showShare ? (
          <ActionButton
            label="Share"
            disabled={disabled || busy}
            onClick={onShare}
          />
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

function ManagerTabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-3 py-1.5 text-xs transition-colors ${
        active
          ? 'bg-[#007acc] text-white'
          : 'border border-[#3c3c3c] text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]'
      }`}
    >
      {label}
    </button>
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
