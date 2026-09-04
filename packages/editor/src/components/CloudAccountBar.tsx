import type { ProjectSyncStatus } from '@js-game-engine/shared';
import { useCloudSyncStore } from '../stores/cloudSyncStore';

interface CloudAccountBarProps {
  onSyncChange?: () => void;
}

export function CloudAccountBar({ onSyncChange }: CloudAccountBarProps) {
  const isConnected = useCloudSyncStore((s) => s.isConnected);
  const displayName = useCloudSyncStore((s) => s.displayName);
  const connect = useCloudSyncStore((s) => s.connect);
  const disconnect = useCloudSyncStore((s) => s.disconnect);

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            connect();
            onSyncChange?.();
          }}
          className="rounded border border-[#3c3c3c] px-3 py-1.5 text-xs text-[#cccccc] transition-colors hover:bg-[#3c3c3c]"
        >
          Connect Cloud
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="rounded bg-[#1b3d2a] px-2 py-1 text-[10px] uppercase tracking-wide text-[#81c784]">
        Cloud connected
      </span>
      <span className="text-xs text-[#858585]">{displayName}</span>
      <button
        type="button"
        onClick={() => {
          disconnect();
          onSyncChange?.();
        }}
        className="rounded px-2 py-1 text-xs text-[#858585] transition-colors hover:bg-[#3c3c3c] hover:text-[#cccccc]"
      >
        Disconnect
      </button>
    </div>
  );
}

export function SyncStatusBadge({ status }: { status: ProjectSyncStatus }) {
  const labels: Record<ProjectSyncStatus, string> = {
    local: 'Local only',
    synced: 'Synced',
    pending: 'Needs push',
    behind: 'Needs pull',
  };

  const colors: Record<ProjectSyncStatus, string> = {
    local: 'bg-[#3c3c3c] text-[#858585]',
    synced: 'bg-[#1b3d2a] text-[#81c784]',
    pending: 'bg-[#4a3a14] text-[#ffb74d]',
    behind: 'bg-[#1a3557] text-[#64b5f6]',
  };

  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}
