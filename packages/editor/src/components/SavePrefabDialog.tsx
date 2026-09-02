import { useEffect, useRef, useState } from 'react';
import { getSelectedObject, useSceneStore } from '../stores/sceneStore';
import { usePrefabStore } from '../stores/prefabStore';

export function SavePrefabDialog() {
  const isOpen = usePrefabStore((s) => s.isSaveDialogOpen);
  const closeSaveDialog = usePrefabStore((s) => s.closeSaveDialog);
  const saveSelectionAsPrefab = useSceneStore((s) => s.saveSelectionAsPrefab);
  const [name, setName] = useState('Prefab');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const selected = getSelectedObject();
      setName(selected?.name ?? 'Prefab');
      setError(null);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a prefab name.');
      return;
    }
    if (!saveSelectionAsPrefab(trimmed)) {
      setError('Select an object in the scene to save as a prefab.');
      return;
    }
    closeSaveDialog();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="w-80 rounded border border-[#3c3c3c] bg-[#252526] p-4 shadow-lg"
        role="dialog"
        aria-labelledby="save-prefab-title"
      >
        <h2 id="save-prefab-title" className="mb-3 text-sm font-medium text-[#cccccc]">
          Save Prefab
        </h2>
        <label className="mb-1 block text-xs text-[#858585]">
          Prefab name (includes selected object and its children)
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
            if (e.key === 'Escape') closeSaveDialog();
          }}
          className="mb-2 w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-2 py-1.5 text-sm text-[#cccccc] outline-none focus:border-[#007acc]"
        />
        {error && <p className="mb-2 text-xs text-[#ef5350]">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={closeSaveDialog}
            className="rounded px-3 py-1 text-xs text-[#cccccc] hover:bg-[#3c3c3c]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded bg-[#007acc] px-3 py-1 text-xs text-white hover:bg-[#006bb3]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
