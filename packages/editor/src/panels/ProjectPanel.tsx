import { useRef } from 'react';
import {
  Color,
  SpriteRenderer,
} from '@js-game-engine/engine';
import { Panel } from '../components/Panel';
import { projectService } from '../services/ProjectService';
import { useAssetStore } from '../stores/assetStore';
import { ScriptComponent } from '@js-game-engine/engine';
import { useScriptStore } from '../stores/scriptStore';
import { useSceneStore } from '../stores/sceneStore';

export function ProjectPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const assets = useAssetStore((s) => s.assets);
  const getThumbnailUrl = useAssetStore((s) => s.getThumbnailUrl);
  const projectId = useSceneStore((s) => s.projectId);
  const scene = useSceneStore((s) => s.scene);
  const markSceneChanged = useSceneStore((s) => s.markSceneChanged);
  const selectObject = useSceneStore((s) => s.selectObject);
  const scripts = useScriptStore((s) => s.scripts);
  const openScript = useScriptStore((s) => s.openScript);
  const openNewScriptDialog = useScriptStore((s) => s.openNewScriptDialog);
  const deleteScript = useScriptStore((s) => s.deleteScript);

  const importFiles = async (files: FileList | File[]) => {
    if (!projectId) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      await projectService.importAsset(projectId, file);
    }
  };

  const createSpriteObject = (assetId: string) => {
    if (!scene) return;
    const image = useAssetStore.getState().getImage(assetId);
    const asset = assets.find((a) => a.id === assetId);
    if (!image || !asset) return;

    const obj = scene.createGameObject(asset.name.replace(/\.[^.]+$/, ''));
    const sprite = obj.addComponent(new SpriteRenderer());
    sprite.spriteAssetId = assetId;
    sprite.image = image;
    sprite.width = image.naturalWidth;
    sprite.height = image.naturalHeight;
    sprite.color = Color.white();
    selectObject(obj.id);
    markSceneChanged();
  };

  const removeScript = (scriptId: string) => {
    if (!scene) return;
    deleteScript(scriptId);
    for (const root of scene.rootObjects) {
      clearScriptReferences(root, scriptId);
    }
    markSceneChanged();
  };

  return (
    <Panel title="Project">
      <div
        className="flex h-full flex-col"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={(e) => {
          e.preventDefault();
          void importFiles(e.dataTransfer.files);
        }}
      >
        <div className="flex shrink-0 gap-2 border-b border-[#3c3c3c] p-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded bg-[#3c3c3c] px-2 py-1 text-xs text-[#cccccc] hover:bg-[#4a4a4a]"
          >
            Import PNG
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void importFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-2">
          {assets.length === 0 ? (
            <p className="text-sm text-[#858585]">
              Drop PNG images here or use Import PNG.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-2">
              {assets.map((asset) => (
                <li key={asset.id} className="group relative">
                  <button
                    type="button"
                    title="Double-click to add to scene"
                    onDoubleClick={() => createSpriteObject(asset.id)}
                    className="w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] p-2 text-left hover:border-[#007acc]"
                  >
                    <div className="mb-1 flex h-16 items-center justify-center overflow-hidden rounded bg-[#252526]">
                      {getThumbnailUrl(asset.id) ? (
                        <img
                          src={getThumbnailUrl(asset.id)}
                          alt={asset.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-[#858585]">PNG</span>
                      )}
                    </div>
                    <p className="truncate text-xs text-[#cccccc]">{asset.name}</p>
                    <p className="text-[10px] text-[#858585]">
                      {asset.width}×{asset.height}
                    </p>
                  </button>
                  <button
                    type="button"
                    title="Delete asset"
                    onClick={() => void projectService.deleteAsset(asset.id, scene)}
                    className="absolute top-1 right-1 rounded bg-[#2d2d2d]/90 px-1.5 py-0.5 text-[10px] text-[#cccccc] opacity-0 transition-opacity hover:bg-[#c62828] hover:text-white group-hover:opacity-100"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-[#3c3c3c] p-2">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-medium text-[#cccccc]">Scripts</h3>
            <button
              type="button"
              onClick={openNewScriptDialog}
              className="rounded px-2 py-0.5 text-xs text-[#cccccc] hover:bg-[#3c3c3c]"
            >
              + New
            </button>
          </div>
          {scripts.length === 0 ? (
            <p className="text-xs text-[#858585]">No scripts yet.</p>
          ) : (
            <ul className="space-y-1">
              {scripts.map((script) => (
                <li
                  key={script.id}
                  className="flex items-center justify-between rounded border border-[#3c3c3c] px-2 py-1"
                >
                  <button
                    type="button"
                    onClick={() => openScript(script.id)}
                    className="truncate text-left text-xs text-[#cccccc] hover:text-white"
                  >
                    {script.name}
                  </button>
                  <button
                    type="button"
                    title="Delete script"
                    onClick={() => removeScript(script.id)}
                    className="ml-2 shrink-0 text-[10px] text-[#858585] hover:text-[#ef5350]"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}

function clearScriptReferences(
  obj: import('@js-game-engine/engine').GameObject,
  scriptId: string,
): void {
  const script = obj.getComponent(ScriptComponent);
  if (script?.scriptAssetId === scriptId) {
    script.scriptAssetId = null;
  }
  for (const child of obj.children) {
    clearScriptReferences(child, scriptId);
  }
}
