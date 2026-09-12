import { useEffect, useRef } from 'react';

interface ShareProjectDialogProps {
  projectName: string | null;
  shareUrl: string | null;
  isSharing?: boolean;
  onClose: () => void;
}

export function ShareProjectDialog({
  projectName,
  shareUrl,
  isSharing = false,
  onClose,
}: ShareProjectDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!shareUrl) return;
    const timer = window.setTimeout(() => inputRef.current?.select(), 0);
    return () => window.clearTimeout(timer);
  }, [shareUrl]);

  if (!projectName && !isSharing) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-md rounded-lg border border-[#3c3c3c] bg-[#252526] p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-project-title"
      >
        <h2 id="share-project-title" className="text-base font-medium text-[#cccccc]">
          {isSharing ? 'Creating share link…' : `Share ${projectName}`}
        </h2>

        {isSharing ? (
          <p className="mt-2 text-sm text-[#858585]">
            Syncing the latest project copy to the cloud.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm leading-relaxed text-[#858585]">
              Anyone with this link can import a copy of the project into their account.
              Changes are not synced back.
            </p>
            <div className="mt-4 flex gap-2">
              <input
                ref={inputRef}
                type="text"
                readOnly
                value={shareUrl ?? ''}
                className="min-w-0 flex-1 rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-xs text-[#cccccc]"
              />
              <button
                type="button"
                disabled={!shareUrl}
                onClick={() => {
                  if (shareUrl) void navigator.clipboard.writeText(shareUrl);
                }}
                className="shrink-0 rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-xs text-[#cccccc] hover:bg-[#2a2d2e] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Copy
              </button>
            </div>
          </>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            disabled={isSharing}
            onClick={onClose}
            className="rounded border border-[#3c3c3c] bg-[#1e1e1e] px-4 py-2 text-xs text-[#cccccc] hover:bg-[#2a2d2e] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSharing ? 'Cancel' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
