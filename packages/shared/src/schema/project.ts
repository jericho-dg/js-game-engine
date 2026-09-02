export const PROJECT_VERSION = '0.0.1';

export interface SerializedVector2 {
  x: number;
  y: number;
}

export interface SerializedTransform {
  localPosition: SerializedVector2;
  localRotation: number;
  localScale: SerializedVector2;
}

export type SerializedComponent =
  | {
      type: 'Camera2D';
      enabled: boolean;
      backgroundColor: string;
      zoom: number;
      position: SerializedVector2;
    }
  | {
      type: 'SpriteRenderer';
      enabled: boolean;
      spriteAssetId: string | null;
      color: string;
      width: number;
      height: number;
      tint: string;
      flipX: boolean;
      flipY: boolean;
      sortingOrder: number;
      pivot: SerializedVector2;
    }
  | {
      type: 'Rotator';
      enabled: boolean;
      speed: number;
    }
  | {
      type: 'ScriptComponent';
      enabled: boolean;
      scriptAssetId: string | null;
    }
  | {
      type: 'BoxCollider2D';
      enabled: boolean;
      width: number;
      height: number;
      offset: SerializedVector2;
      isTrigger: boolean;
    }
  | {
      type: 'Rigidbody2D';
      enabled: boolean;
      velocity: SerializedVector2;
      gravityScale: number;
      isKinematic: boolean;
    }
  | {
      type: 'TilemapRenderer';
      enabled: boolean;
      tilesetAssetId: string | null;
      tileWidth: number;
      tileHeight: number;
      mapWidth: number;
      mapHeight: number;
      tiles: number[];
      sortingOrder: number;
    };

export interface PrefabRecord {
  id: string;
  name: string;
  root: SerializedGameObject;
}

export interface ScriptRecord {
  id: string;
  name: string;
  source: string;
}

export interface SerializedGameObject {
  id: string;
  name: string;
  active: boolean;
  transform: SerializedTransform;
  components: SerializedComponent[];
  children: SerializedGameObject[];
}

export interface SerializedScene {
  name: string;
  rootObjects: SerializedGameObject[];
}

export interface ProjectData {
  version: string;
  name: string;
  scene: SerializedScene;
  scripts: ScriptRecord[];
  prefabs?: PrefabRecord[];
}

export interface AssetRecord {
  id: string;
  projectId: string;
  name: string;
  type: 'sprite';
  mimeType: string;
  width: number;
  height: number;
}

export interface StoredProject {
  id: string;
  name: string;
  data: ProjectData;
  updatedAt: number;
}

export interface StoredAsset {
  id: string;
  projectId: string;
  name: string;
  type: 'sprite';
  mimeType: string;
  width: number;
  height: number;
  blob: Blob;
}
