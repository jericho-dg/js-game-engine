import { useEffect, useState } from 'react';
import type { ProjectSummary } from '../services/ProjectService';
import { projectService } from '../services/ProjectService';
import { loadProjectIntoEditor } from '../services/projectLoader';
import { useAppStore } from '../stores/appStore';
import { useSceneStore } from '../stores/sceneStore';

export function OpenProjectDialog() {
  const open = useAppStore((s) => s.isOpenProjectDialogOpen);
  const close = useAppStore((s) => s.closeOpenProjectDialog);
  const currentProjectId = useSceneStore((s) => s.projectId);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setError(null);
    void projectService
      .listProjects()
      .then(setProjects)
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const openProject = async (projectId: string) => {
    if (openingId) return;
    setOpeningId(projectId);
    setError(null);
    try {
      await loadProjectIntoEditor(projectId);
      close();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="flex max-h-[80vh] w-full max-w-xl flex-col rounded-lg border border-[#3c3c3c] bg-[#252526] shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="open-project-title"
      >
        <div className="border-b border-[#3c3c3c] px-5 py-4">
          <h2 id="open-project-title" className="text-base font-medium text-[#cccccc]">
            Open Project
          </h2>
          <p className="mt-1 text-xs text-[#858585]">Switch to another project in your browser.</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-sm text-[#858585]">Loading projects…</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-[#858585]">No saved projects yet.</p>
          ) : (
            <ul className="space-y-2">
              {projects.map((project) => (
                <li key={project.id}>
                  <button
                    type="button"
                    disabled={openingId !== null}
                    onClick={() => void openProject(project.id)}
                    className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                      project.id === currentProjectId
                        ? 'border-[#007acc] bg-[#094771]/30'
                        : 'border-[#3c3c3c] bg-[#1e1e1e] hover:border-[#555555] hover:bg-[#2a2a2a]'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <div>
                      <div className="text-sm text-[#cccccc]">{project.name}</div>
                      <div className="mt-0.5 text-xs text-[#858585]">
                        {formatUpdatedAt(project.updatedAt)}
                        {project.id === currentProjectId ? ' · Current' : ''}
                      </div>
                    </div>
                    <span className="text-xs text-[#007acc]">
                      {openingId === project.id ? 'Opening…' : 'Open'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error ? <p className="mt-3 text-xs text-[#f48771]">{error}</p> : null}
        </div>

        <div className="flex justify-end border-t border-[#3c3c3c] px-5 py-4">
          <button
            type="button"
            onClick={close}
            className="rounded px-3 py-1.5 text-xs text-[#cccccc] transition-colors hover:bg-[#3c3c3c]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function formatUpdatedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
