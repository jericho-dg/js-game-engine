import {
  PROJECT_VERSION,
  type AssetRecord,
  type ProjectData,
  type ScriptRecord,
} from '@js-game-engine/shared';
import {
  Color,
  Camera2D,
  Scene,
  ScriptComponent,
  SpriteRenderer,
  TilemapRenderer,
  BoxCollider2D,
  Rigidbody2D,
  deserializeScene,
  serializeScene,
  type GameObject,
} from '@js-game-engine/engine';
import { db } from './db';
import { useAssetStore } from '../stores/assetStore';
import { usePrefabStore } from '../stores/prefabStore';
import { useSceneStore } from '../stores/sceneStore';
import { useScriptStore } from '../stores/scriptStore';
import { createDefaultPlayerMoveScript } from '../stores/scriptStore';

const DEFAULT_PROJECT_ID = 'default-project';
const LEGACY_SPIN_SCRIPT_ID = 'script-spin-demo';
const CURRENT_PLAYER_SCRIPT_ID = 'script-player-move-demo';

function migrateLoadedProject(scene: Scene, scripts: ScriptRecord[]): ScriptRecord[] {
  let nextScripts = scripts;

  const hasCurrentPlayerScript = scripts.some((script) => script.id === CURRENT_PLAYER_SCRIPT_ID);
  if (!hasCurrentPlayerScript) {
    const spinIndex = scripts.findIndex((script) => script.id === LEGACY_SPIN_SCRIPT_ID);
    if (spinIndex !== -1) {
      nextScripts = scripts.map((script, index) =>
        index === spinIndex ? createDefaultPlayerMoveScript() : script,
      );
    }
  }

  const scriptIds = new Set(nextScripts.map((script) => script.id));
  if (scriptIds.has(CURRENT_PLAYER_SCRIPT_ID)) {
    remapScriptReferences(scene, LEGACY_SPIN_SCRIPT_ID, CURRENT_PLAYER_SCRIPT_ID);
  }

  return nextScripts;
}

function remapScriptReferences(
  scene: Scene,
  fromScriptId: string,
  toScriptId: string,
): void {
  for (const root of scene.rootObjects) {
    remapScriptReferencesRecursive(root, fromScriptId, toScriptId);
  }
}

function remapScriptReferencesRecursive(
  obj: GameObject,
  fromScriptId: string,
  toScriptId: string,
): void {
  for (const component of obj.getComponents(ScriptComponent)) {
    if (component.scriptAssetId === fromScriptId) {
      component.scriptAssetId = toScriptId;
    }
  }
  for (const child of obj.children) {
    remapScriptReferencesRecursive(child, fromScriptId, toScriptId);
  }
}

function createDefaultProjectData(): ProjectData {
  const playerScript = createDefaultPlayerMoveScript();
  const scene = new Scene('Main');

  const camera = scene.createGameObject('Main Camera');
  camera.addComponent(new Camera2D());

  const player = scene.createGameObject('Player');
  player.transform.localPosition.set(0, -80);
  const playerSprite = player.addComponent(new SpriteRenderer());
  playerSprite.color = Color.fromHex('#4fc3f7');
  playerSprite.width = 48;
  playerSprite.height = 48;
  const playerCollider = player.addComponent(new BoxCollider2D());
  playerCollider.width = 48;
  playerCollider.height = 48;
  const playerBody = player.addComponent(new Rigidbody2D());
  playerBody.gravityScale = 1;
  const playerScriptComponent = player.addComponent(new ScriptComponent());
  playerScriptComponent.scriptAssetId = playerScript.id;

  const ground = scene.createGameObject('Ground');
  ground.transform.localPosition.set(0, -120);
  const groundSprite = ground.addComponent(new SpriteRenderer());
  groundSprite.color = Color.fromHex('#66bb6a');
  groundSprite.width = 320;
  groundSprite.height = 32;
  groundSprite.sortingOrder = -1;
  const groundCollider = ground.addComponent(new BoxCollider2D());
  groundCollider.width = 320;
  groundCollider.height = 32;

  const marker = scene.createGameObject('Marker');
  marker.transform.localPosition.set(100, -40);
  const markerSprite = marker.addComponent(new SpriteRenderer());
  markerSprite.color = Color.fromHex('#ffb74d');
  markerSprite.width = 24;
  markerSprite.height = 24;
  const markerCollider = marker.addComponent(new BoxCollider2D());
  markerCollider.width = 24;
  markerCollider.height = 24;
  markerCollider.isTrigger = true;

  return {
    version: PROJECT_VERSION,
    name: 'Untitled Project',
    scene: serializeScene(scene),
    scripts: [playerScript],
    prefabs: [],
  };
}

export class ProjectService {
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  async loadOrCreateDefault(): Promise<{
    projectId: string;
    projectName: string;
    scene: Scene;
    scripts: ScriptRecord[];
    prefabs: import('@js-game-engine/shared').PrefabRecord[];
  }> {
    let stored = await db.projects.get(DEFAULT_PROJECT_ID);

    if (!stored) {
      const data = createDefaultProjectData();
      stored = {
        id: DEFAULT_PROJECT_ID,
        name: data.name,
        data,
        updatedAt: Date.now(),
      };
      await db.projects.put(stored);
    }

    let scripts = stored.data.scripts ?? [];

    await useAssetStore.getState().loadForProject(stored.id);
    const scene = deserializeScene(stored.data.scene);
    scripts = migrateLoadedProject(scene, scripts);
    hydrateSceneAssets(scene);

    const prefabs = stored.data.prefabs ?? [];
    usePrefabStore.getState().setPrefabs(prefabs);

    return {
      projectId: stored.id,
      projectName: stored.name,
      scene,
      scripts,
      prefabs,
    };
  }

  async save(scene: Scene, projectId: string, projectName: string): Promise<void> {
    const scripts = useScriptStore.getState().scripts;
    const prefabs = usePrefabStore.getState().prefabs;
    const data: ProjectData = {
      version: PROJECT_VERSION,
      name: projectName,
      scene: serializeScene(scene),
      scripts,
      prefabs,
    };

    await db.projects.put({
      id: projectId,
      name: projectName,
      data,
      updatedAt: Date.now(),
    });
  }

  scheduleAutoSave(scene: Scene, projectId: string, projectName: string): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      void this.save(scene, projectId, projectName);
    }, 2000);
  }

  cancelAutoSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }

  async resetToDemo(projectId: string): Promise<{
    projectId: string;
    projectName: string;
    scene: Scene;
    scripts: ScriptRecord[];
    prefabs: import('@js-game-engine/shared').PrefabRecord[];
  }> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    await db.assets.where('projectId').equals(projectId).delete();
    useAssetStore.getState().clearAll();

    const data = createDefaultProjectData();
    await db.projects.put({
      id: projectId,
      name: data.name,
      data,
      updatedAt: Date.now(),
    });

    const scene = deserializeScene(data.scene);
    hydrateSceneAssets(scene);
    usePrefabStore.getState().setPrefabs(data.prefabs ?? []);

    return {
      projectId,
      projectName: data.name,
      scene,
      scripts: data.scripts,
      prefabs: data.prefabs ?? [],
    };
  }

  async importAsset(projectId: string, file: File): Promise<AssetRecord> {
    if (!file.type.startsWith('image/')) {
      throw new Error('Only image files are supported.');
    }

    const image = await loadImageFromFile(file);
    const id = crypto.randomUUID();
    const record: AssetRecord = {
      id,
      projectId,
      name: file.name,
      type: 'sprite',
      mimeType: file.type || 'image/png',
      width: image.naturalWidth,
      height: image.naturalHeight,
    };

    await db.assets.put({
      ...record,
      blob: file,
    });

    useAssetStore.getState().registerAsset(record, image, file);
    return record;
  }

  async getAssetBlob(assetId: string): Promise<Blob | undefined> {
    const stored = await db.assets.get(assetId);
    return stored?.blob;
  }

  async syncAssets(projectId: string, assets: import('../stores/assetStore').AssetSnapshot[]): Promise<void> {
    const keepIds = new Set(assets.map((asset) => asset.id));
    const existing = await db.assets.where('projectId').equals(projectId).toArray();

    await Promise.all(
      existing
        .filter((entry) => !keepIds.has(entry.id))
        .map((entry) => db.assets.delete(entry.id)),
    );

    await Promise.all(
      assets.map((asset) =>
        db.assets.put({
          id: asset.id,
          projectId: asset.projectId,
          name: asset.name,
          type: asset.type,
          mimeType: asset.mimeType,
          width: asset.width,
          height: asset.height,
          blob: asset.blob,
        }),
      ),
    );
  }

  async deleteAsset(assetId: string, scene: Scene | null): Promise<void> {
    useSceneStore.getState().beginSceneChange();

    if (scene) {
      clearSceneAssetReferences(scene, assetId);
    }

    await db.assets.delete(assetId);
    useAssetStore.getState().removeAsset(assetId);

    const { markSceneChanged, projectId, projectName } = useSceneStore.getState();
    markSceneChanged();
    if (scene && projectId) {
      await this.save(scene, projectId, projectName);
    }
  }
}

export const projectService = new ProjectService();

export function hydrateSceneAssets(scene: Scene): void {
  const { getImage } = useAssetStore.getState();
  for (const root of scene.rootObjects) {
    hydrateObjectAssets(root, getImage);
  }
}

/** @deprecated Use hydrateSceneAssets */
export function hydrateSceneSprites(scene: Scene): void {
  hydrateSceneAssets(scene);
}

function hydrateObjectAssets(
  obj: GameObject,
  getImage: (id: string) => HTMLImageElement | undefined,
): void {
  for (const sprite of obj.getComponents(SpriteRenderer)) {
    if (sprite.spriteAssetId) {
      const image = getImage(sprite.spriteAssetId);
      if (image) {
        sprite.image = image;
        if (sprite.width === 64 && sprite.height === 64) {
          sprite.width = image.naturalWidth;
          sprite.height = image.naturalHeight;
        }
      }
    }
  }

  for (const tilemap of obj.getComponents(TilemapRenderer)) {
    if (tilemap.tilesetAssetId) {
      const image = getImage(tilemap.tilesetAssetId);
      if (image) {
        tilemap.image = image;
      }
    }
    tilemap.ensureTileBuffer();
  }

  for (const child of obj.children) {
    hydrateObjectAssets(child, getImage);
  }
}

function clearAssetReferences(
  obj: GameObject,
  assetId: string,
): void {
  for (const sprite of obj.getComponents(SpriteRenderer)) {
    if (sprite.spriteAssetId === assetId) {
      sprite.spriteAssetId = null;
      sprite.image = null;
    }
  }
  for (const tilemap of obj.getComponents(TilemapRenderer)) {
    if (tilemap.tilesetAssetId === assetId) {
      tilemap.tilesetAssetId = null;
      tilemap.image = null;
    }
  }
  for (const child of obj.children) {
    clearAssetReferences(child, assetId);
  }
}

function clearSceneAssetReferences(scene: Scene, assetId: string): void {
  for (const root of scene.rootObjects) {
    clearAssetReferences(root, assetId);
  }
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    image.src = url;
  });
}
