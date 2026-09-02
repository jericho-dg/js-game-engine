import { useEffect, useRef, useState } from 'react';
import type { GameObject } from '@js-game-engine/engine';
import { getAddableComponentsForObject } from './componentRegistry';
import { useSceneStore } from '../stores/sceneStore';

export function AddComponentMenu({ object }: { object: GameObject }) {
  const addComponent = useSceneStore((s) => s.addComponent);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const options = getAddableComponentsForObject(object);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={options.length === 0}
        className="w-full rounded border border-[#3c3c3c] px-2 py-1.5 text-xs text-[#cccccc] hover:bg-[#3c3c3c] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Add Component
      </button>
      {open && options.length > 0 && (
        <ul className="absolute right-0 left-0 z-10 mt-1 max-h-48 overflow-auto rounded border border-[#3c3c3c] bg-[#252526] py-1 shadow-lg">
          {options.map((entry) => (
            <li key={entry.label}>
              <button
                type="button"
                onClick={() => {
                  addComponent(object.id, entry.componentClass);
                  setOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-[#cccccc] hover:bg-[#094771] hover:text-white"
              >
                {entry.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
