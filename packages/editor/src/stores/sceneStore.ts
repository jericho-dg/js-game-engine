import { create } from 'zustand';
import {
  Camera2D,
  Color,
  GameObject,
  Rotator,
  Scene,
  SpriteRenderer,
} from '@js-game-engine/engine';
import { projectService } from '../services/ProjectService';
import { useAssetStore } from './assetStore';

export type EditorMode = 'edit' | 'play';

interface SceneState {
  scene: Scene | null;
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
  setEditorMode: (mode: EditorMode) => void;
  deleteSelected: () => void;
  createEmptyObject: () => void;
  assignSpriteAsset: (objectId: string, assetId: string | null) => void;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  scene: null,
  projectId: null,
  projectName: 'Untitled Project',
  selectedId: null,
  sceneRevision: 0,
  editorMode: 'edit',
  isLoaded: false,

  selectObject: (id) => set({ selectedId: id }),

  markSceneChanged: () => {
    const { scene, projectId, projectName } = get();
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
      isLoaded: true,
      selectedId: null,
      editorMode: 'edit',
    }),

  setEditorMode: (mode) => set({ editorMode: mode }),

  deleteSelected: () => {
    const { scene, selectedId } = get();
    if (!scene || !selectedId) return;
    const obj = findObjectById(scene, selectedId);
    if (!obj) return;
    obj.destroy();
    scene.update(0);
    set({ selectedId: null });
    get().markSceneChanged();
  },

  createEmptyObject: () => {
    const { scene } = get();
    if (!scene) return;
    const obj = scene.createGameObject('GameObject');
    const sprite = obj.addComponent(new SpriteRenderer());
    sprite.color = Color.fromHex('#ab47bc');
    sprite.width = 32;
    sprite.height = 32;
    set({ selectedId: obj.id });
    get().markSceneChanged();
  },

  assignSpriteAsset: (objectId, assetId) => {
    const { scene } = get();
    if (!scene) return;
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

// Demo scene helper kept for tests / fallback reference
export function createDemoScene(): Scene {
  const scene = new Scene('Main');
  const camera = scene.createGameObject('Main Camera');
  camera.addComponent(new Camera2D());
  const player = scene.createGameObject('Player');
  player.addComponent(new SpriteRenderer());
  player.addComponent(new Rotator());
  return scene;
}
