import { useEffect, useRef, useState } from 'react';
import { sanitizeScriptClassName, isValidScriptClassName } from '../scripting/scriptNaming';
import { useScriptStore } from '../stores/scriptStore';
import { useSceneStore } from '../stores/sceneStore';

export function NewScriptDialog() {
  const isOpen = useScriptStore((s) => s.isNewScriptDialogOpen);
  const closeNewScriptDialog = useScriptStore((s) => s.closeNewScriptDialog);
  const createScript = useScriptStore((s) => s.createScript);
  const markSceneChanged = useSceneStore((s) => s.markSceneChanged);
  const beginSceneChange = useSceneStore((s) => s.beginSceneChange);
  const [name, setName] = useState('NewScript');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName('NewScript');
      setError(null);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const submit = () => {
    const className = sanitizeScriptClassName(name);
    if (!isValidScriptClassName(className)) {
      setError('Use letters, numbers, or underscore. Must start with a letter.');
      return;
    }
    beginSceneChange();
    createScript(className);
    markSceneChanged();
    closeNewScriptDialog();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="w-80 rounded border border-[#3c3c3c] bg-[#252526] p-4 shadow-lg"
        role="dialog"
        aria-labelledby="new-script-title"
      >
        <h2 id="new-script-title" className="mb-3 text-sm font-medium text-[#cccccc]">
          New Script
        </h2>
        <label className="mb-1 block text-xs text-[#858585]">
          Class name (also used for the file name)
        </label>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') closeNewScriptDialog();
          }}
          className="mb-2 w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-2 py-1.5 text-sm text-[#cccccc] outline-none focus:border-[#007acc]"
        />
        {error && <p className="mb-2 text-xs text-[#ef5350]">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={closeNewScriptDialog}
            className="rounded px-3 py-1 text-xs text-[#cccccc] hover:bg-[#3c3c3c]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded bg-[#007acc] px-3 py-1 text-xs text-white hover:bg-[#006bb3]"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
