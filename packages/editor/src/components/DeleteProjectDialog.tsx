import { useEffect, useRef } from 'react';
import type { ProjectSummary } from '../services/ProjectService';

export type DeleteProjectScope = 'local' | 'everywhere';

interface DeleteProjectDialogProps {
  project: ProjectSummary | null;
  showCloudOptions: boolean;
  remoteOnlyLocalDelete: boolean;
  onClose: () => void;
  onConfirm: (scope: DeleteProjectScope) => void | Promise<void>;
  isDeleting?: boolean;
}

export function DeleteProjectDialog({
  project,
  showCloudOptions,
  remoteOnlyLocalDelete,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeleteProjectDialogProps) {
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!project) return;
    const timer = window.setTimeout(() => deleteButtonRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeleting) onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [project, isDeleting, onClose]);

  if (!project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-md rounded border border-[#3c3c3c] bg-[#252526] p-4 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-project-title"
      >
        <h2 id="delete-project-title" className="mb-2 text-sm font-medium text-[#cccccc]">
          Delete Project
        </h2>

        {showCloudOptions ? (
          <>
            <p className="mb-4 text-xs leading-relaxed text-[#858585]">
              Choose how to delete{' '}
              <span className="text-[#cccccc]">{project.name}</span>.
            </p>
            <div className="mb-4 space-y-2 text-xs leading-relaxed text-[#858585]">
              <p>
                <span className="text-[#cccccc]">Remove from this device</span> keeps the
                cloud copy. It will reappear after the next sync.
              </p>
              <p>
                <span className="text-[#cccccc]">Delete everywhere</span> permanently removes
                the project from this device and the cloud.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isDeleting}
                onClick={onClose}
                className="rounded px-3 py-1.5 text-xs text-[#cccccc] hover:bg-[#3c3c3c] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void onConfirm('local')}
                className="rounded border border-[#3c3c3c] px-3 py-1.5 text-xs text-[#cccccc] hover:bg-[#3c3c3c] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isDeleting ? 'Deleting…' : 'Remove from this device'}
              </button>
              <button
                ref={deleteButtonRef}
                type="button"
                disabled={isDeleting}
                onClick={() => void onConfirm('everywhere')}
                className="rounded bg-[#c62828] px-3 py-1.5 text-xs text-white hover:bg-[#d32f2f] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isDeleting ? 'Deleting…' : 'Delete everywhere'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-4 text-xs leading-relaxed text-[#858585]">
              Delete <span className="text-[#cccccc]">{project.name}</span>?
              {remoteOnlyLocalDelete
                ? ' This removes the project from this device only. Your cloud copy will remain and reappear when you sign in.'
                : ' This cannot be undone.'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={onClose}
                className="rounded px-3 py-1.5 text-xs text-[#cccccc] hover:bg-[#3c3c3c] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                ref={deleteButtonRef}
                type="button"
                disabled={isDeleting}
                onClick={() => void onConfirm(remoteOnlyLocalDelete ? 'local' : 'everywhere')}
                className="rounded bg-[#c62828] px-3 py-1.5 text-xs text-white hover:bg-[#d32f2f] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
