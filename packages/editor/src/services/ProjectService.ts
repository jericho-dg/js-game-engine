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
  deserializeScene,
  serializeScene,
} from '@js-game-engine/engine';
import { db } from './db';
import { useAssetStore } from '../stores/assetStore';
import { useSceneStore } from '../stores/sceneStore';
import { useScriptStore } from '../stores/scriptStore';
import { createDefaultSpinScript } from '../stores/scriptStore';

const DEFAULT_PROJECT_ID = 'default-project';

function createDefaultProjectData(): ProjectData {
  const spinScript = createDefaultSpinScript();
  const scene = new Scene('Main');

  const camera = scene.createGameObject('Main Camera');
  camera.addComponent(new Camera2D());

  const player = scene.createGameObject('Player');
  const playerSprite = player.addComponent(new SpriteRenderer());
  playerSprite.color = Color.fromHex('#4fc3f7');
  playerSprite.width = 48;
  playerSprite.height = 48;
  const playerScript = player.addComponent(new ScriptComponent());
  playerScript.scriptAssetId = spinScript.id;

  const ground = scene.createGameObject('Ground');
  ground.transform.localPosition.set(0, -120);
  const groundSprite = ground.addComponent(new SpriteRenderer());
  groundSprite.color = Color.fromHex('#66bb6a');
  groundSprite.width = 320;
  groundSprite.height = 32;
  groundSprite.sortingOrder = -1;

  const marker = scene.createGameObject('Marker');
  marker.transform.localPosition.set(100, 60);
  const markerSprite = marker.addComponent(new SpriteRenderer());
  markerSprite.color = Color.fromHex('#ffb74d');
  markerSprite.width = 24;
  markerSprite.height = 24;

  return {
    version: PROJECT_VERSION,
    name: 'Untitled Project',
    scene: serializeScene(scene),
    scripts: [spinScript],
  };
}

export class ProjectService {
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  async loadOrCreateDefault(): Promise<{
    projectId: string;
    projectName: string;
    scene: Scene;
    scripts: ScriptRecord[];
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

    const scripts = stored.data.scripts ?? [];

    await useAssetStore.getState().loadForProject(stored.id);
    const scene = deserializeScene(stored.data.scene);
    hydrateSceneSprites(scene);

    return {
      projectId: stored.id,
      projectName: stored.name,
      scene,
      scripts,
    };
  }

  async save(scene: Scene, projectId: string, projectName: string): Promise<void> {
    const scripts = useScriptStore.getState().scripts;
    const data: ProjectData = {
      version: PROJECT_VERSION,
      name: projectName,
      scene: serializeScene(scene),
      scripts,
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

  async deleteAsset(assetId: string, scene: Scene | null): Promise<void> {
    await db.assets.delete(assetId);
    useAssetStore.getState().removeAsset(assetId);

    if (scene) {
      clearSceneAssetReferences(scene, assetId);
      const { markSceneChanged, projectId, projectName } = useSceneStore.getState();
      markSceneChanged();
      if (projectId) {
        await this.save(scene, projectId, projectName);
      }
    }
  }
}

export const projectService = new ProjectService();

export function hydrateSceneSprites(scene: Scene): void {
  const { getImage } = useAssetStore.getState();
  for (const root of scene.rootObjects) {
    hydrateObjectSprites(root, getImage);
  }
}

function hydrateObjectSprites(
  obj: import('@js-game-engine/engine').GameObject,
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
  for (const child of obj.children) {
    hydrateObjectSprites(child, getImage);
  }
}

function clearAssetReferences(
  obj: import('@js-game-engine/engine').GameObject,
  assetId: string,
): void {
  for (const sprite of obj.getComponents(SpriteRenderer)) {
    if (sprite.spriteAssetId === assetId) {
      sprite.spriteAssetId = null;
      sprite.image = null;
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
