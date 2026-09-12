import type { CloudApiSharedProjectInfo } from '@js-game-engine/shared';

interface AcceptSharedProjectDialogProps {
  info: CloudApiSharedProjectInfo | null;
  isLoading?: boolean;
  isImporting?: boolean;
  error?: string | null;
  onImport: () => void;
  onDismiss: () => void;
}

export function AcceptSharedProjectDialog({
  info,
  isLoading = false,
  isImporting = false,
  error,
  onImport,
  onDismiss,
}: AcceptSharedProjectDialogProps) {
  if (!info && !isLoading && !error) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-md rounded-lg border border-[#3c3c3c] bg-[#252526] p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="accept-share-title"
      >
        <h2 id="accept-share-title" className="text-base font-medium text-[#cccccc]">
          Shared project
        </h2>

        {isLoading ? (
          <p className="mt-2 text-sm text-[#858585]">Loading share details…</p>
        ) : error ? (
          <p className="mt-2 text-sm text-[#f48771]">{error}</p>
        ) : info ? (
          <>
            <p className="mt-2 text-sm leading-relaxed text-[#858585]">
              <span className="text-[#cccccc]">{info.ownerDisplayName}</span> shared{' '}
              <span className="text-[#cccccc]">{info.projectName}</span> with you.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-[#858585]">
              Import creates a local copy on this device. You can edit it independently.
            </p>
          </>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={isImporting}
            onClick={onDismiss}
            className="rounded border border-[#3c3c3c] bg-[#1e1e1e] px-4 py-2 text-xs text-[#cccccc] hover:bg-[#2a2d2e] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {error ? 'Close' : 'Not now'}
          </button>
          {info && !error ? (
            <button
              type="button"
              disabled={isImporting}
              onClick={onImport}
              className="rounded bg-[#007acc] px-4 py-2 text-xs text-white hover:bg-[#1a8ad4] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isImporting ? 'Importing…' : 'Import copy'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
