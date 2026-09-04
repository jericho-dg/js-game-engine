import { create } from 'zustand';
import type { SceneRecord, SerializedScene } from '@js-game-engine/shared';
import { Camera2D, Scene, serializeScene } from '@js-game-engine/engine';

interface SceneAssetState {
  scenes: SceneRecord[];
  activeSceneId: string | null;
  setScenes: (scenes: SceneRecord[], activeSceneId: string) => void;
  clear: () => void;
  updateActiveSceneData: (data: SerializedScene) => void;
  createScene: (name?: string) => SceneRecord;
  deleteScene: (id: string) => boolean;
  renameScene: (id: string, name: string) => void;
  getSceneRecord: (id: string) => SceneRecord | undefined;
  getActiveSceneRecord: () => SceneRecord | undefined;
}

function createBlankSerializedScene(name: string): SerializedScene {
  const scene = new Scene(name);
  const camera = scene.createGameObject('Main Camera');
  camera.addComponent(new Camera2D());
  return serializeScene(scene);
}

export const useSceneAssetStore = create<SceneAssetState>((set, get) => ({
  scenes: [],
  activeSceneId: null,

  setScenes: (scenes, activeSceneId) => set({ scenes, activeSceneId }),

  clear: () => set({ scenes: [], activeSceneId: null }),

  updateActiveSceneData: (data) => {
    const { activeSceneId, scenes } = get();
    if (!activeSceneId) return;
    set({
      scenes: scenes.map((record) =>
        record.id === activeSceneId
          ? { ...record, name: data.name, data }
          : record,
      ),
    });
  },

  createScene: (name) => {
    const sceneName = name?.trim() || `Scene ${get().scenes.length + 1}`;
    const record: SceneRecord = {
      id: crypto.randomUUID(),
      name: sceneName,
      data: createBlankSerializedScene(sceneName),
    };
    set((state) => ({ scenes: [...state.scenes, record] }));
    return record;
  },

  deleteScene: (id) => {
    const { scenes, activeSceneId } = get();
    if (scenes.length <= 1) return false;
    const nextScenes = scenes.filter((record) => record.id !== id);
    const nextActive =
      activeSceneId === id ? nextScenes[0]!.id : activeSceneId;
    set({ scenes: nextScenes, activeSceneId: nextActive });
    return true;
  },

  renameScene: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((state) => ({
      scenes: state.scenes.map((record) =>
        record.id === id
          ? { ...record, name: trimmed, data: { ...record.data, name: trimmed } }
          : record,
      ),
    }));
  },

  getSceneRecord: (id) => get().scenes.find((record) => record.id === id),

  getActiveSceneRecord: () => {
    const { activeSceneId, scenes } = get();
    if (!activeSceneId) return undefined;
    return scenes.find((record) => record.id === activeSceneId);
  },
}));
