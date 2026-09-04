import { create } from 'zustand';
import type { PrefabRecord, ScriptRecord, SerializedScene } from '@js-game-engine/shared';
import { deserializeScene, serializeScene } from '@js-game-engine/engine';
import { hydrateSceneAssets, projectService } from '../services/ProjectService';
import { useAssetStore, type AssetSnapshot } from './assetStore';
import { usePrefabStore } from './prefabStore';
import { useSceneAssetStore } from './sceneAssetStore';
import { useSceneStore } from './sceneStore';
import { useScriptStore } from './scriptStore';

const MAX_HISTORY = 50;
const DEBOUNCE_MS = 400;

export interface EditorSnapshot {
  scene: SerializedScene;
  scripts: ScriptRecord[];
  prefabs: PrefabRecord[];
  assets: AssetSnapshot[];
  selectedId: string | null;
}

interface HistoryState {
  past: EditorSnapshot[];
  future: EditorSnapshot[];
  isRestoring: boolean;
  canUndo: boolean;
  canRedo: boolean;
  captureSnapshot: () => EditorSnapshot;
  beginChange: () => void;
  cancelPendingChange: () => void;
  scheduleSnapshot: () => void;
  resetHistory: () => void;
  undo: () => void;
  redo: () => void;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingBaseline: EditorSnapshot | null = null;

function snapshotsEqual(a: EditorSnapshot, b: EditorSnapshot): boolean {
  if (a.selectedId !== b.selectedId) return false;
  if (a.assets.length !== b.assets.length) return false;

  const assetKey = (assets: AssetSnapshot[]) =>
    assets
      .map((asset) => asset.id)
      .sort()
      .join(',');

  if (assetKey(a.assets) !== assetKey(b.assets)) return false;

  return (
    JSON.stringify(a.scene) === JSON.stringify(b.scene) &&
    JSON.stringify(a.scripts) === JSON.stringify(b.scripts) &&
    JSON.stringify(a.prefabs) === JSON.stringify(b.prefabs)
  );
}

async function restoreSnapshot(snapshot: EditorSnapshot): Promise<void> {
  const { projectId, projectName, sceneRevision } = useSceneStore.getState();

  await useAssetStore.getState().restoreFromSnapshots(snapshot.assets);
  if (projectId) {
    await projectService.syncAssets(projectId, snapshot.assets);
  }

  const scene = deserializeScene(snapshot.scene);
  hydrateSceneAssets(scene);

  useSceneAssetStore.getState().updateActiveSceneData(snapshot.scene);

  useScriptStore.getState().setScripts(snapshot.scripts);
  usePrefabStore.getState().setPrefabs(snapshot.prefabs);

  useSceneStore.setState({
    scene,
    selectedId: snapshot.selectedId,
    sceneRevision: sceneRevision + 1,
  });

  if (projectId) {
    await projectService.save(scene, projectId, projectName);
  }
}

function flushPendingBaseline(
  past: EditorSnapshot[],
): { past: EditorSnapshot[]; flushed: EditorSnapshot | null } {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  const baseline = pendingBaseline;
  pendingBaseline = null;
  if (!baseline) return { past, flushed: null };

  const last = past[past.length - 1];
  if (last && snapshotsEqual(last, baseline)) {
    return { past, flushed: baseline };
  }

  const nextPast = [...past, baseline];
  if (nextPast.length > MAX_HISTORY) {
    nextPast.shift();
  }
  return { past: nextPast, flushed: baseline };
}

function pushBaselineToPast(
  baseline: EditorSnapshot,
  past: EditorSnapshot[],
): EditorSnapshot[] {
  const last = past[past.length - 1];
  if (last && snapshotsEqual(last, baseline)) return past;

  const nextPast = [...past, baseline];
  if (nextPast.length > MAX_HISTORY) {
    nextPast.shift();
  }
  return nextPast;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  isRestoring: false,
  canUndo: false,
  canRedo: false,

  captureSnapshot: () => {
    const { scene, selectedId } = useSceneStore.getState();
    if (!scene) {
      throw new Error('Cannot capture history without a loaded scene.');
    }
    return {
      scene: serializeScene(scene),
      scripts: structuredClone(useScriptStore.getState().scripts),
      prefabs: structuredClone(usePrefabStore.getState().prefabs),
      assets: useAssetStore.getState().captureSnapshots(),
      selectedId,
    };
  },

  beginChange: () => {
    if (get().isRestoring) return;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    if (pendingBaseline) {
      const current = get().captureSnapshot();
      if (!snapshotsEqual(pendingBaseline, current)) {
        const past = pushBaselineToPast(pendingBaseline, get().past);
        set({ past, future: [], canUndo: true });
        pendingBaseline = current;
      }
    } else {
      pendingBaseline = get().captureSnapshot();
    }

    set({ canUndo: true });
  },

  cancelPendingChange: () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    pendingBaseline = null;
    set({ canUndo: get().past.length > 0 });
  },

  scheduleSnapshot: () => {
    if (get().isRestoring) return;
    if (!pendingBaseline) return;

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      const baseline = pendingBaseline;
      pendingBaseline = null;
      if (!baseline) return;

      if (snapshotsEqual(baseline, get().captureSnapshot())) return;

      const last = get().past[get().past.length - 1];
      if (last && snapshotsEqual(last, baseline)) return;

      const past = [...get().past, baseline];
      if (past.length > MAX_HISTORY) {
        past.shift();
      }

      set({
        past,
        future: [],
        canUndo: past.length > 0 || pendingBaseline !== null,
        canRedo: false,
      });
    }, DEBOUNCE_MS);

    set({
      canUndo: get().past.length > 0 || pendingBaseline !== null,
    });
  },

  resetHistory: () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    pendingBaseline = null;
    set({
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
    });
  },

  undo: () => {
    if (get().isRestoring) return;

    const current = get().captureSnapshot();

    if (pendingBaseline && !snapshotsEqual(pendingBaseline, current)) {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }

      const baseline = pendingBaseline;
      pendingBaseline = null;
      const nextFuture = [current, ...get().future];

      set({ isRestoring: true });
      void restoreSnapshot(baseline).then(() => {
        set({
          isRestoring: false,
          future: nextFuture,
          canUndo: get().past.length > 0,
          canRedo: nextFuture.length > 0,
        });
      });
      return;
    }

    const flushed = flushPendingBaseline(get().past);
    const { past } = flushed;
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const nextPast = past.slice(0, -1);
    const nextFuture = [current, ...get().future];

    set({ isRestoring: true });
    void restoreSnapshot(previous).then(() => {
      set({
        isRestoring: false,
        past: nextPast,
        future: nextFuture,
        canUndo: nextPast.length > 0 || pendingBaseline !== null,
        canRedo: nextFuture.length > 0,
      });
    });
  },

  redo: () => {
    if (get().isRestoring) return;

    const { past, future } = get();
    if (future.length === 0) return;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    pendingBaseline = null;

    const current = get().captureSnapshot();
    const next = future[0];
    const nextPast = [...past, current];
    const nextFuture = future.slice(1);

    set({ isRestoring: true });
    void restoreSnapshot(next).then(() => {
      set({
        isRestoring: false,
        past: nextPast,
        future: nextFuture,
        canUndo: nextPast.length > 0,
        canRedo: nextFuture.length > 0,
      });
    });
  },
}));
