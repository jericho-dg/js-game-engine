import { useEffect, useRef } from 'react';

interface PublishGameDialogProps {
  projectName: string;
  open: boolean;
  playUrl: string | null;
  isPublishing?: boolean;
  onClose: () => void;
  onConfirm: (options: { listInGallery: boolean }) => void;
}

export function PublishGameDialog({
  projectName,
  open,
  playUrl,
  isPublishing = false,
  onClose,
  onConfirm,
}: PublishGameDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!playUrl) return;
    const timer = window.setTimeout(() => inputRef.current?.select(), 0);
    return () => window.clearTimeout(timer);
  }, [playUrl]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-md rounded-lg border border-[#3c3c3c] bg-[#252526] p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-game-title"
      >
        <h2 id="publish-game-title" className="text-base font-medium text-[#cccccc]">
          {isPublishing ? 'Publishing game…' : playUrl ? 'Game published' : `Publish ${projectName}`}
        </h2>

        {isPublishing ? (
          <p className="mt-2 text-sm text-[#858585]">
            Building and uploading your standalone game. This may take a moment.
          </p>
        ) : playUrl ? (
          <>
            <p className="mt-2 text-sm leading-relaxed text-[#858585]">
              Share this link to let anyone play your game in the browser.
            </p>
            <div className="mt-4 flex gap-2">
              <input
                ref={inputRef}
                type="text"
                readOnly
                value={playUrl}
                className="min-w-0 flex-1 rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-xs text-[#cccccc]"
              />
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(playUrl)}
                className="shrink-0 rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-xs text-[#cccccc] hover:bg-[#2a2d2e]"
              >
                Copy
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm leading-relaxed text-[#858585]">
              Upload a standalone HTML5 build and get a shareable play URL.
            </p>
            <label className="mt-4 flex items-start gap-2 text-sm text-[#cccccc]">
              <input
                type="checkbox"
                defaultChecked
                id="publish-list-in-gallery"
                className="mt-0.5"
              />
              <span>List in the public game gallery</span>
            </label>
          </>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={isPublishing}
            onClick={onClose}
            className="rounded border border-[#3c3c3c] bg-[#1e1e1e] px-4 py-2 text-xs text-[#cccccc] hover:bg-[#2a2d2e] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {playUrl ? 'Close' : 'Cancel'}
          </button>
          {!playUrl && !isPublishing ? (
            <button
              type="button"
              onClick={() => {
                const checkbox = document.getElementById(
                  'publish-list-in-gallery',
                ) as HTMLInputElement | null;
                onConfirm({ listInGallery: checkbox?.checked ?? true });
              }}
              className="rounded bg-[#007acc] px-4 py-2 text-xs text-white hover:bg-[#1a8ad4]"
            >
              Publish
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
