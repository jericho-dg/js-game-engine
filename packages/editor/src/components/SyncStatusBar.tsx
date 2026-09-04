import { useAccountStore } from '../stores/accountStore';
import { useCloudSyncStore } from '../stores/cloudSyncStore';
import { cloudSyncService } from '../services/cloudSyncService';

interface SyncStatusBarProps {
  compact?: boolean;
  onRetry?: () => void;
}

export function SyncStatusBar({ compact = false, onRetry }: SyncStatusBarProps) {
  const mode = useCloudSyncStore((s) => s.mode);
  const status = useCloudSyncStore((s) => s.status);
  const lastSyncedAt = useCloudSyncStore((s) => s.lastSyncedAt);
  const pendingCount = useCloudSyncStore((s) => s.pendingCount);
  const errorMessage = useCloudSyncStore((s) => s.errorMessage);
  const isSignedIn = useAccountStore((s) => s.isSignedIn());

  if (mode === 'remote' && !isSignedIn) {
    return null;
  }

  const label = formatSyncLabel(status, lastSyncedAt, pendingCount);
  const showRetry = status === 'error' || status === 'pending';
  const tone = statusTone(status);

  return (
    <div className={`flex items-center gap-2 ${compact ? '' : 'min-w-0'}`}>
      <span
        className={`truncate text-xs ${tone}`}
        title={errorMessage ?? label}
      >
        {label}
      </span>
      {showRetry ? (
        <button
          type="button"
          onClick={() => {
            if (onRetry) {
              onRetry();
              return;
            }
            void cloudSyncService.retryPending();
          }}
          className="shrink-0 rounded px-2 py-0.5 text-xs text-[#4fc3f7] hover:bg-[#3c3c3c]"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

function statusTone(status: ReturnType<typeof useCloudSyncStore.getState>['status']): string {
  switch (status) {
    case 'syncing':
      return 'text-[#4fc3f7]';
    case 'error':
      return 'text-[#f48771]';
    case 'pending':
      return 'text-[#dcdcaa]';
    default:
      return 'text-[#858585]';
  }
}

function formatSyncLabel(
  status: ReturnType<typeof useCloudSyncStore.getState>['status'],
  lastSyncedAt: number | null,
  pendingCount: number,
): string {
  if (status === 'syncing') {
    return 'Syncing…';
  }

  if (status === 'error') {
    return 'Sync failed';
  }

  if (status === 'pending' && pendingCount > 0) {
    return `${pendingCount} pending`;
  }

  if (lastSyncedAt) {
    return `Synced ${formatRelativeTime(lastSyncedAt)}`;
  }

  return 'Ready';
}

function formatRelativeTime(timestamp: number): string {
  const deltaMs = Date.now() - timestamp;
  const seconds = Math.floor(deltaMs / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}
