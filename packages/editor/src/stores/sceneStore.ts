import { create } from 'zustand';
import { Vector2 } from '@js-game-engine/shared';
import {
  Camera2D,
  Color,
  Debug,
  GameObject,
  Input,
  Scene,
  ScriptComponent,
  SpriteRenderer,
  TilemapRenderer,
  BoxCollider2D,
  type Component,
  deserializeScene,
  serializeScene,
  serializeGameObject,
  instantiatePrefabRoot,
} from '@js-game-engine/engine';
import { projectService, hydrateSceneAssets } from '../services/ProjectService';
import { worldToLocalPoint } from '../gizmos/hitTest';
import { attachScriptsToScene, detachScriptsFromScene } from '../scripting/ScriptRuntime';
import { getPlayBlockers } from '../scripting/validateScripts';
import { usePrefabStore } from './prefabStore';
import { useAssetStore } from './assetStore';
import { useConsoleStore } from './consoleStore';
import { useScriptStore } from './scriptStore';

export type EditorMode = 'edit' | 'play';

interface SceneState {
  scene: Scene | null;
  playScene: Scene | null;
  projectId: string | null;
  projectName: string;
  selectedId: string | null;
  sceneRevision: number;
  editorMode: EditorMode;
  isLoaded: boolean;
  selectObject: (id: string | null) => void;
  markSceneChanged: () => void;
  setScene: (scene: Scene) => void;
  initProject: (projectId: string, projectName: string, scene: Scene) => void;
  enterPlayMode: () => Promise<void>;
  exitPlayMode: () => void;
  getActiveScene: () => Scene | null;
  deleteSelected: () => void;
  createEmptyObject: () => void;
  createTilemapObject: () => void;
  addComponent: (objectId: string, componentClass: new () => Component) => void;
  removeComponent: (objectId: string, component: Component) => void;
  assignSpriteAsset: (objectId: string, assetId: string | null) => void;
  assignTilesetAsset: (objectId: string, assetId: string | null) => void;
  assignScriptAsset: (objectId: string, scriptId: string | null) => void;
  saveSelectionAsPrefab: (name: string) => boolean;
  instantiatePrefab: (prefabId: string) => void;
  tilePaintIndex: number;
  setTilePaintIndex: (index: number) => void;
  paintTileAtWorld: (objectId: string, worldX: number, worldY: number, erase?: boolean) => void;
  resetProject: () => Promise<void>;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  scene: null,
  playScene: null,
  projectId: null,
  projectName: 'Untitled Project',
  selectedId: null,
  sceneRevision: 0,
  editorMode: 'edit',
  isLoaded: false,
  tilePaintIndex: 0,

  selectObject: (id) => set({ selectedId: id }),

  markSceneChanged: () => {
    const { scene, projectId, projectName, editorMode } = get();
    if (editorMode === 'play') return;
    set((s) => ({ sceneRevision: s.sceneRevision + 1 }));
    if (scene && projectId) {
      projectService.scheduleAutoSave(scene, projectId, projectName);
    }
  },

  setScene: (scene) => set({ scene, sceneRevision: get().sceneRevision + 1 }),

  initProject: (projectId, projectName, scene) =>
    set({
      projectId,
      projectName,
      scene,
      playScene: null,
      isLoaded: true,
      selectedId: null,
      editorMode: 'edit',
    }),

  getActiveScene: () => {
    const { editorMode, scene, playScene } = get();
    return editorMode === 'play' ? playScene : scene;
  },

  enterPlayMode: async () => {
    const { scene } = get();
    if (!scene) return;

    const scriptState = useScriptStore.getState();
    await scriptState.ensureScriptsCompiledForScene(scene);

    const scripts = useScriptStore.getState().scripts;
    const blockers = getPlayBlockers(scene, scripts, {
      hasUnsavedScripts: useScriptStore.getState().hasUnsavedScripts(),
      scriptErrors: useScriptStore.getState().scriptErrors,
      isScriptPlayReady: (script) => useScriptStore.getState().isScriptPlayReady(script),
    });

    if (blockers.length > 0) {
      useConsoleStore.getState().clear();
      for (const message of blockers) {
        useConsoleStore.getState().log('error', message);
      }
      useConsoleStore.getState().log(
        'error',
        'Play mode blocked — save and fix scripts before playing.',
      );
      set({ playScene: null, editorMode: 'edit' });
      return;
    }

    const snapshot = serializeScene(scene);
    const playScene = deserializeScene(snapshot);
    hydrateSceneAssets(playScene);

    Debug.setLogCallback((level, message) => {
      useConsoleStore.getState().log(level, message);
    });
    Input._clear();

    const { errors } = attachScriptsToScene(playScene, scripts);
    if (errors.length > 0) {
      useConsoleStore.getState().clear();
      for (const error of errors) {
        useConsoleStore.getState().log(
          'error',
          `${error.objectName} / ${error.scriptName}: ${error.message}`,
        );
      }
      detachScriptsFromScene(playScene);
      Debug.setLogCallback(null);
      Input._clear();
      set({ playScene: null, editorMode: 'edit' });
      return;
    }

    set({
      playScene,
      editorMode: 'play',
      selectedId: null,
      sceneRevision: get().sceneRevision + 1,
    });
  },

  exitPlayMode: () => {
    const { playScene } = get();
    if (playScene) detachScriptsFromScene(playScene);
    Debug.setLogCallback(null);
    Input._clear();
    set({
      playScene: null,
      editorMode: 'edit',
      sceneRevision: get().sceneRevision + 1,
    });
  },

  deleteSelected: () => {
    const { scene, selectedId, editorMode } = get();
    if (editorMode === 'play' || !scene || !selectedId) return;
    const obj = findObjectById(scene, selectedId);
    if (!obj) return;
    obj.destroy();
    scene.update(0);
    set({ selectedId: null });
    get().markSceneChanged();
  },

  createEmptyObject: () => {
    const { scene, editorMode } = get();
    if (editorMode === 'play' || !scene) return;
    const obj = scene.createGameObject('GameObject');
    const sprite = obj.addComponent(new SpriteRenderer());
    sprite.color = Color.fromHex('#ab47bc');
    sprite.width = 32;
    sprite.height = 32;
    set({ selectedId: obj.id });
    get().markSceneChanged();
  },

  createTilemapObject: () => {
    const { scene, editorMode } = get();
    if (editorMode === 'play' || !scene) return;
    const obj = scene.createGameObject('Tilemap');
    const tilemap = obj.addComponent(new TilemapRenderer());
    tilemap.mapWidth = 20;
    tilemap.mapHeight = 12;
    tilemap.ensureTileBuffer();
    set({ selectedId: obj.id });
    get().markSceneChanged();
  },

  addComponent: (objectId, componentClass) => {
    const { scene, editorMode } = get();
    if (editorMode === 'play' || !scene) return;

    const obj = findObjectById(scene, objectId);
    if (!obj || obj.getComponent(componentClass)) return;

    const component = obj.addComponent(new componentClass());

    if (component instanceof SpriteRenderer) {
      component.color = Color.fromHex('#ab47bc');
      component.width = 32;
      component.height = 32;
    }

    if (component instanceof BoxCollider2D) {
      const sprite = obj.getComponent(SpriteRenderer);
      if (sprite) {
        component.width = sprite.width;
        component.height = sprite.height;
      }
    }

    if (component instanceof TilemapRenderer) {
      component.mapWidth = 20;
      component.mapHeight = 12;
      component.ensureTileBuffer();
    }

    set((s) => ({ sceneRevision: s.sceneRevision + 1 }));
    get().markSceneChanged();
  },

  removeComponent: (objectId, component) => {
    const { scene, editorMode } = get();
    if (editorMode === 'play' || !scene) return;

    const obj = findObjectById(scene, objectId);
    if (!obj || component.gameObject !== obj) return;
    if (!component.remove()) return;

    set((s) => ({ sceneRevision: s.sceneRevision + 1 }));
    get().markSceneChanged();
  },

  assignTilesetAsset: (objectId, assetId) => {
    const { scene, editorMode } = get();
    if (editorMode === 'play' || !scene) return;
    const obj = findObjectById(scene, objectId);
    if (!obj) return;
    const tilemap = obj.getComponent(TilemapRenderer);
    if (!tilemap) return;

    tilemap.tilesetAssetId = assetId;
    if (assetId) {
      const image = useAssetStore.getState().getImage(assetId);
      if (image) {
        tilemap.image = image;
      }
    } else {
      tilemap.image = null;
    }
    get().markSceneChanged();
  },

  assignSpriteAsset: (objectId, assetId) => {
    const { scene, editorMode } = get();
    if (editorMode === 'play' || !scene) return;
    const obj = findObjectById(scene, objectId);
    if (!obj) return;
    const sprite = obj.getComponent(SpriteRenderer);
    if (!sprite) return;

    sprite.spriteAssetId = assetId;
    if (assetId) {
      const image = useAssetStore.getState().getImage(assetId);
      if (image) {
        sprite.image = image;
        sprite.width = image.naturalWidth;
        sprite.height = image.naturalHeight;
      }
    } else {
      sprite.image = null;
    }
    get().markSceneChanged();
  },

  assignScriptAsset: (objectId, scriptId) => {
    const { scene, editorMode } = get();
    if (editorMode === 'play' || !scene) return;
    const obj = findObjectById(scene, objectId);
    if (!obj) return;
    let scriptComponent = obj.getComponent(ScriptComponent);
    if (!scriptComponent) {
      scriptComponent = obj.addComponent(new ScriptComponent());
    }
    scriptComponent.scriptAssetId = scriptId;
    get().markSceneChanged();
  },

  saveSelectionAsPrefab: (name) => {
    const { scene, selectedId, editorMode } = get();
    if (editorMode === 'play' || !scene || !selectedId) return false;

    const obj = findObjectById(scene, selectedId);
    if (!obj) return false;

    const trimmed = name.trim();
    if (!trimmed) return false;

    usePrefabStore.getState().addPrefab({
      id: crypto.randomUUID(),
      name: trimmed,
      root: serializeGameObject(obj),
    });
    get().markSceneChanged();
    return true;
  },

  instantiatePrefab: (prefabId) => {
    const { scene, editorMode } = get();
    if (editorMode === 'play' || !scene) return;

    const prefab = usePrefabStore.getState().getPrefab(prefabId);
    if (!prefab) return;

    const instance = instantiatePrefabRoot(scene, prefab.root);
    set({ selectedId: instance.id });
    get().markSceneChanged();
  },

  setTilePaintIndex: (index) => set({ tilePaintIndex: Math.max(0, index) }),

  paintTileAtWorld: (objectId, worldX, worldY, erase = false) => {
    const { scene, editorMode, tilePaintIndex } = get();
    if (editorMode === 'play' || !scene) return;

    const obj = findObjectById(scene, objectId);
    const tilemap = obj?.getComponent(TilemapRenderer);
    if (!obj || !tilemap) return;

    const local = worldToLocalPoint(obj.transform, new Vector2(worldX, worldY));
    const cell = tilemap.localToCell(local.x, local.y);
    if (!cell) return;

    tilemap.setTile(cell.column, cell.row, erase ? -1 : tilePaintIndex);
    set((s) => ({ sceneRevision: s.sceneRevision + 1 }));
    get().markSceneChanged();
  },

  resetProject: async () => {
    const { projectId, editorMode } = get();
    if (!projectId) return;

    if (editorMode === 'play') {
      get().exitPlayMode();
    }

    const result = await projectService.resetToDemo(projectId);
    useScriptStore.getState().setScripts(result.scripts);
    usePrefabStore.getState().setPrefabs(result.prefabs ?? []);
    await useScriptStore.getState().compileAllSavedScripts();
    useConsoleStore.getState().clear();

    set({
      scene: result.scene,
      playScene: null,
      projectName: result.projectName,
      selectedId: null,
      editorMode: 'edit',
      sceneRevision: get().sceneRevision + 1,
    });

    const firstScript = result.scripts[0];
    if (firstScript) {
      useScriptStore.getState().openScript(firstScript.id);
    }
  },
}));

export function getSelectedObject(): GameObject | null {
  const { scene, selectedId } = useSceneStore.getState();
  if (!scene || !selectedId) return null;
  return findObjectById(scene, selectedId);
}

export function findObjectById(scene: Scene, id: string): GameObject | null {
  for (const root of scene.rootObjects) {
    const found = findObjectByIdRecursive(root, id);
    if (found) return found;
  }
  return null;
}

function findObjectByIdRecursive(obj: GameObject, id: string): GameObject | null {
  if (obj.id === id) return obj;
  for (const child of obj.children) {
    const found = findObjectByIdRecursive(child, id);
    if (found) return found;
  }
  return null;
}

export function createDemoScene(): Scene {
  const scene = new Scene('Main');
  const camera = scene.createGameObject('Main Camera');
  camera.addComponent(new Camera2D());
  const player = scene.createGameObject('Player');
  player.addComponent(new SpriteRenderer());
  player.addComponent(new ScriptComponent());
  return scene;
}
