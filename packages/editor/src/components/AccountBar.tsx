import { useState } from 'react';
import { useAccountStore } from '../stores/accountStore';
import { cloudSyncService } from '../services/cloudSyncService';

export function AccountBar() {
  const displayName = useAccountStore((s) => s.displayName);
  const isSignedIn = useAccountStore((s) => s.isSignedIn());
  const signOut = useAccountStore((s) => s.signOut);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const usesRemote = cloudSyncService.usesRemoteCloud();

  if (!usesRemote) {
    return null;
  }

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#858585]">{displayName}</span>
        <button
          type="button"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            void signOut().finally(() => setSigningOut(false));
          }}
          className="rounded px-2 py-1 text-xs text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc] disabled:opacity-40"
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="rounded border border-[#3c3c3c] px-3 py-1.5 text-xs text-[#cccccc] hover:bg-[#3c3c3c]"
      >
        Sign in
      </button>
      <AuthDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}

function AuthDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const signIn = useAccountStore((s) => s.signIn);
  const signUp = useAccountStore((s) => s.signUp);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        await signUp(displayName, password);
      } else {
        await signIn(displayName, password);
      }
      setPassword('');
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-lg border border-[#3c3c3c] bg-[#252526] p-5 shadow-xl">
        <h2 className="text-base font-medium text-[#cccccc]">
          {mode === 'signup' ? 'Create account' : 'Sign in to sync'}
        </h2>
        <p className="mt-2 text-sm text-[#858585]">
          {mode === 'signup'
            ? 'Create an account to sync projects with the cloud.'
            : 'Sign in to sync projects with the cloud.'}
        </p>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            className={`rounded px-3 py-1 text-xs ${
              mode === 'signin'
                ? 'bg-[#007acc] text-white'
                : 'border border-[#3c3c3c] text-[#858585] hover:bg-[#3c3c3c]'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`rounded px-3 py-1 text-xs ${
              mode === 'signup'
                ? 'bg-[#007acc] text-white'
                : 'border border-[#3c3c3c] text-[#858585] hover:bg-[#3c3c3c]'
            }`}
          >
            Sign up
          </button>
        </div>

        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name"
          autoComplete="username"
          className="mt-4 w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm text-[#cccccc] outline-none focus:border-[#007acc]"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          className="mt-3 w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm text-[#cccccc] outline-none focus:border-[#007acc]"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && displayName.trim() && password) {
              void submit();
            }
          }}
        />

        {error ? (
          <p className="mt-3 rounded border border-[#5a1d1d] bg-[#3a1f1f] px-3 py-2 text-xs text-[#f48771]">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded px-3 py-1.5 text-xs text-[#858585] hover:bg-[#3c3c3c] disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !displayName.trim() || !password}
            onClick={() => void submit()}
            className="rounded bg-[#007acc] px-3 py-1.5 text-xs text-white hover:bg-[#1a8ad4] disabled:opacity-40"
          >
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
