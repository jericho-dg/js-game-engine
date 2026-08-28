import { useEffect, useState } from 'react';
import type { GameObject } from '@js-game-engine/engine';
import { Panel } from '../components/Panel';
import { useSceneStore } from '../stores/sceneStore';

export function HierarchyPanel() {
  const scene = useSceneStore((s) => s.scene);
  const selectedId = useSceneStore((s) => s.selectedId);
  const sceneRevision = useSceneStore((s) => s.sceneRevision);
  const selectObject = useSceneStore((s) => s.selectObject);
  const createEmptyObject = useSceneStore((s) => s.createEmptyObject);
  const deleteSelected = useSceneStore((s) => s.deleteSelected);

  if (!scene) return null;

  return (
    <Panel title="Hierarchy">
      <div className="flex shrink-0 gap-1 border-b border-[#3c3c3c] p-1">
        <button
          type="button"
          title="Create empty object"
          onClick={createEmptyObject}
          className="rounded px-2 py-0.5 text-xs text-[#cccccc] hover:bg-[#3c3c3c]"
        >
          +
        </button>
        <button
          type="button"
          title="Delete selected"
          onClick={deleteSelected}
          className="rounded px-2 py-0.5 text-xs text-[#cccccc] hover:bg-[#3c3c3c]"
        >
          Delete
        </button>
      </div>
      <ul className="p-1 text-sm">
        {scene.rootObjects.map((obj) => (
          <HierarchyNode
            key={obj.id}
            object={obj}
            depth={0}
            selectedId={selectedId}
            sceneRevision={sceneRevision}
            onSelect={selectObject}
          />
        ))}
      </ul>
    </Panel>
  );
}

function HierarchyNode({
  object,
  depth,
  selectedId,
  sceneRevision,
  onSelect,
}: {
  object: GameObject;
  depth: number;
  selectedId: string | null;
  sceneRevision: number;
  onSelect: (id: string | null) => void;
}) {
  const isSelected = object.id === selectedId;
  const markSceneChanged = useSceneStore((s) => s.markSceneChanged);
  const [isRenaming, setIsRenaming] = useState(false);
  const [name, setName] = useState(object.name);

  useEffect(() => {
    if (!isRenaming) {
      setName(object.name);
    }
  }, [object.name, isRenaming, sceneRevision]);

  const commitRename = () => {
    const trimmed = name.trim();
    if (trimmed) {
      object.name = trimmed;
      setName(trimmed);
    } else {
      setName(object.name);
    }
    setIsRenaming(false);
    markSceneChanged();
  };

  const paddingLeft = `${depth * 12 + 8}px`;

  return (
    <li>
      {isRenaming ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitRename();
            }
            if (e.key === 'Escape') {
              setIsRenaming(false);
              setName(object.name);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full rounded border border-[#007acc] bg-[#1e1e1e] px-2 py-1 text-sm text-[#ffffff] outline-none"
          style={{ paddingLeft }}
        />
      ) : (
        <button
          type="button"
          onClick={() => onSelect(object.id)}
          onDoubleClick={(e) => {
            e.preventDefault();
            onSelect(object.id);
            setIsRenaming(true);
          }}
          title="Double-click to rename"
          className={`w-full rounded px-2 py-1 text-left transition-colors ${
            isSelected
              ? 'bg-[#094771] text-[#ffffff]'
              : 'text-[#cccccc] hover:bg-[#2a2d2e]'
          }`}
          style={{ paddingLeft }}
        >
          {object.name}
        </button>
      )}
      {object.children.length > 0 && (
        <ul>
          {object.children.map((child) => (
            <HierarchyNode
              key={child.id}
              object={child}
              depth={depth + 1}
              selectedId={selectedId}
              sceneRevision={sceneRevision}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
