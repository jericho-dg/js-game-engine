import { create } from 'zustand';
import {
  Camera2D,
  Color,
  Debug,
  GameObject,
  Input,
  Scene,
  ScriptComponent,
  SpriteRenderer,
  deserializeScene,
  serializeScene,
} from '@js-game-engine/engine';
import { projectService, hydrateSceneSprites } from '../services/ProjectService';
import { attachScriptsToScene, detachScriptsFromScene } from '../scripting/ScriptRuntime';
import { initScriptCompiler } from '../scripting/ScriptCompiler';
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
  isPlayLoading: boolean;
  selectObject: (id: string | null) => void;
  markSceneChanged: () => void;
  setScene: (scene: Scene) => void;
  initProject: (projectId: string, projectName: string, scene: Scene) => void;
  enterPlayMode: () => Promise<void>;
  exitPlayMode: () => void;
  getActiveScene: () => Scene | null;
  deleteSelected: () => void;
  createEmptyObject: () => void;
  assignSpriteAsset: (objectId: string, assetId: string | null) => void;
  assignScriptAsset: (objectId: string, scriptId: string | null) => void;
  addScriptComponent: (objectId: string) => void;
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
  isPlayLoading: false,

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
    if (!scene || get().isPlayLoading) return;

    set({ isPlayLoading: true });
    useConsoleStore.getState().clear();

    try {
      await initScriptCompiler();
      const snapshot = serializeScene(scene);
      const playScene = deserializeScene(snapshot);
      hydrateSceneSprites(playScene);

      Debug.setLogCallback((level, message) => {
        useConsoleStore.getState().log(level, message);
      });
      Input._clear();

      const scripts = useScriptStore.getState().scripts;
      const { errors } = await attachScriptsToScene(playScene, scripts);
      for (const error of errors) {
        useConsoleStore.getState().log(
          'error',
          `${error.objectName} / ${error.scriptName}: ${error.message}`,
        );
      }

      set({
        playScene,
        editorMode: 'play',
        selectedId: null,
        sceneRevision: get().sceneRevision + 1,
      });
    } finally {
      set({ isPlayLoading: false });
    }
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

  addScriptComponent: (objectId) => {
    const { scene, editorMode } = get();
    if (editorMode === 'play' || !scene) return;
    const obj = findObjectById(scene, objectId);
    if (!obj || obj.getComponent(ScriptComponent)) return;
    obj.addComponent(new ScriptComponent());
    get().markSceneChanged();
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
