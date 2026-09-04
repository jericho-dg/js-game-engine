import { useEffect, useRef } from 'react';
import type { ProjectSummary } from '../services/ProjectService';

interface DeleteProjectDialogProps {
  project: ProjectSummary | null;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isDeleting?: boolean;
}

export function DeleteProjectDialog({
  project,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="w-80 rounded border border-[#3c3c3c] bg-[#252526] p-4 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-project-title"
      >
        <h2 id="delete-project-title" className="mb-2 text-sm font-medium text-[#cccccc]">
          Delete Project
        </h2>
        <p className="mb-4 text-xs leading-relaxed text-[#858585]">
          Delete <span className="text-[#cccccc]">{project.name}</span>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose();
            }}
            className="rounded px-3 py-1 text-xs text-[#cccccc] hover:bg-[#3c3c3c] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            ref={deleteButtonRef}
            type="button"
            disabled={isDeleting}
            onClick={() => void onConfirm()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void onConfirm();
            }}
            className="rounded bg-[#c62828] px-3 py-1 text-xs text-white hover:bg-[#d32f2f] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
