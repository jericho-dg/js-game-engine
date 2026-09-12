import { useEffect, useRef } from 'react';
import type { SyncConflict, SyncConflictResolution } from '@js-game-engine/shared';

interface SyncConflictDialogProps {
  conflict: SyncConflict | null;
  onResolve: (resolution: SyncConflictResolution) => void | Promise<void>;
  isResolving?: boolean;
}

export function SyncConflictDialog({
  conflict,
  onResolve,
  isResolving = false,
}: SyncConflictDialogProps) {
  const keepLocalRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!conflict) return;
    const timer = window.setTimeout(() => keepLocalRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [conflict]);

  if (!conflict) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-md rounded-lg border border-[#3c3c3c] bg-[#252526] p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sync-conflict-title"
      >
        <h2 id="sync-conflict-title" className="text-base font-medium text-[#cccccc]">
          Sync conflict — {conflict.projectName}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#858585]">
          This project was changed on this device and in the cloud since the last sync.
        </p>

        <div className="mt-4 space-y-2 rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-3 text-xs">
          <p className="text-[#858585]">
            <span className="text-[#cccccc]">This device</span>
            {' · '}
            {formatTimestamp(conflict.localUpdatedAt)}
          </p>
          <p className="text-[#858585]">
            <span className="text-[#cccccc]">Cloud</span>
            {' · '}
            {formatTimestamp(conflict.cloudUpdatedAt)}
          </p>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-[#858585]">
          Choose which version to keep, or keep both as separate projects.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <button
            ref={keepLocalRef}
            type="button"
            disabled={isResolving}
            onClick={() => void onResolve('local')}
            className="rounded bg-[#007acc] px-3 py-2 text-left text-xs text-white hover:bg-[#1a8ad4] disabled:opacity-40"
          >
            Keep this device
            <span className="mt-0.5 block text-[10px] font-normal text-[#cce8ff]">
              Upload your local copy to the cloud
            </span>
          </button>
          <button
            type="button"
            disabled={isResolving}
            onClick={() => void onResolve('cloud')}
            className="rounded border border-[#3c3c3c] px-3 py-2 text-left text-xs text-[#cccccc] hover:bg-[#3c3c3c] disabled:opacity-40"
          >
            Keep cloud
            <span className="mt-0.5 block text-[10px] text-[#858585]">
              Replace this device&apos;s copy with the cloud version
            </span>
          </button>
          <button
            type="button"
            disabled={isResolving}
            onClick={() => void onResolve('both')}
            className="rounded border border-[#3c3c3c] px-3 py-2 text-left text-xs text-[#cccccc] hover:bg-[#3c3c3c] disabled:opacity-40"
          >
            Keep both as copies
            <span className="mt-0.5 block text-[10px] text-[#858585]">
              Keep your local copy here and add the cloud version as a new project
            </span>
          </button>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={isResolving}
            onClick={() => void onResolve('skip')}
            className="rounded px-3 py-1.5 text-xs text-[#858585] hover:bg-[#3c3c3c] disabled:opacity-40"
          >
            Decide later
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
