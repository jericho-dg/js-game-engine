import {
  Color,
  type SerializedComponent,
  type SerializedGameObject,
  type SerializedScene,
} from '@js-game-engine/shared';
import { ScriptComponent } from '../components/ScriptComponent';
import { Camera2D } from '../components/Camera2D';
import { Rotator } from '../components/Rotator';
import { SpriteRenderer } from '../components/SpriteRenderer';
import { BoxCollider2D } from '../components/BoxCollider2D';
import { Rigidbody2D } from '../components/Rigidbody2D';
import { TilemapRenderer } from '../components/TilemapRenderer';
import { AudioSource } from '../components/AudioSource';
import { GameObject } from '../core/GameObject';
import { Scene } from '../core/Scene';

function colorToHex(color: Color): string {
  const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

export function serializeGameObject(obj: GameObject): SerializedGameObject {
  const components: SerializedComponent[] = [];

  for (const component of obj.getComponents(Camera2D)) {
    components.push({
      type: 'Camera2D',
      enabled: component.enabled,
      backgroundColor: colorToHex(component.backgroundColor),
      zoom: component.zoom,
      position: { x: component.position.x, y: component.position.y },
    });
  }

  for (const component of obj.getComponents(SpriteRenderer)) {
    components.push({
      type: 'SpriteRenderer',
      enabled: component.enabled,
      spriteAssetId: component.spriteAssetId,
      color: colorToHex(component.color),
      width: component.width,
      height: component.height,
      tint: colorToHex(component.tint),
      flipX: component.flipX,
      flipY: component.flipY,
      sortingOrder: component.sortingOrder,
      pivot: { x: component.pivot.x, y: component.pivot.y },
    });
  }

  for (const component of obj.getComponents(TilemapRenderer)) {
    component.ensureTileBuffer();
    components.push({
      type: 'TilemapRenderer',
      enabled: component.enabled,
      tilesetAssetId: component.tilesetAssetId,
      tileWidth: component.tileWidth,
      tileHeight: component.tileHeight,
      mapWidth: component.mapWidth,
      mapHeight: component.mapHeight,
      tiles: [...component.tiles],
      sortingOrder: component.sortingOrder,
    });
  }

  for (const component of obj.getComponents(Rotator)) {
    components.push({
      type: 'Rotator',
      enabled: component.enabled,
      speed: component.speed,
    });
  }

  for (const component of obj.getComponents(ScriptComponent)) {
    components.push({
      type: 'ScriptComponent',
      enabled: component.enabled,
      scriptAssetId: component.scriptAssetId,
    });
  }

  for (const component of obj.getComponents(BoxCollider2D)) {
    components.push({
      type: 'BoxCollider2D',
      enabled: component.enabled,
      width: component.width,
      height: component.height,
      offset: { x: component.offset.x, y: component.offset.y },
      isTrigger: component.isTrigger,
    });
  }

  for (const component of obj.getComponents(Rigidbody2D)) {
    components.push({
      type: 'Rigidbody2D',
      enabled: component.enabled,
      velocity: { x: component.velocity.x, y: component.velocity.y },
      gravityScale: component.gravityScale,
      isKinematic: component.isKinematic,
    });
  }

  for (const component of obj.getComponents(AudioSource)) {
    components.push({
      type: 'AudioSource',
      enabled: component.enabled,
      audioAssetId: component.audioAssetId,
      volume: component.volume,
      loop: component.loop,
      playOnAwake: component.playOnAwake,
    });
  }

  return {
    id: obj.id,
    name: obj.name,
    active: obj.active,
    transform: {
      localPosition: {
        x: obj.transform.localPosition.x,
        y: obj.transform.localPosition.y,
      },
      localRotation: obj.transform.localRotation,
      localScale: {
        x: obj.transform.localScale.x,
        y: obj.transform.localScale.y,
      },
    },
    components,
    children: obj.children.map(serializeGameObject),
  };
}

export function serializeScene(scene: Scene): SerializedScene {
  return {
    name: scene.name,
    rootObjects: scene.rootObjects.map(serializeGameObject),
  };
}

function applyComponents(obj: GameObject, components: SerializedComponent[]): void {
  for (const data of components) {
    if (data.type === 'Camera2D') {
      const camera = obj.addComponent(new Camera2D());
      camera.enabled = data.enabled;
      camera.backgroundColor = Color.fromHex(data.backgroundColor);
      camera.zoom = data.zoom;
      camera.position.set(data.position.x, data.position.y);
    } else if (data.type === 'SpriteRenderer') {
      const sprite = obj.addComponent(new SpriteRenderer());
      sprite.enabled = data.enabled;
      sprite.spriteAssetId = data.spriteAssetId;
      sprite.color = Color.fromHex(data.color);
      sprite.width = data.width;
      sprite.height = data.height;
      sprite.tint = Color.fromHex(data.tint);
      sprite.flipX = data.flipX;
      sprite.flipY = data.flipY;
      sprite.sortingOrder = data.sortingOrder;
      sprite.pivot.set(data.pivot.x, data.pivot.y);
    } else if (data.type === 'TilemapRenderer') {
      const tilemap = obj.addComponent(new TilemapRenderer());
      tilemap.enabled = data.enabled;
      tilemap.tilesetAssetId = data.tilesetAssetId;
      tilemap.tileWidth = data.tileWidth;
      tilemap.tileHeight = data.tileHeight;
      tilemap.mapWidth = data.mapWidth;
      tilemap.mapHeight = data.mapHeight;
      tilemap.tiles = [...data.tiles];
      tilemap.sortingOrder = data.sortingOrder;
      tilemap.ensureTileBuffer();
    } else if (data.type === 'Rotator') {
      const rotator = obj.addComponent(new Rotator());
      rotator.enabled = data.enabled;
      rotator.speed = data.speed;
    } else if (data.type === 'ScriptComponent') {
      const script = obj.addComponent(new ScriptComponent());
      script.enabled = data.enabled;
      script.scriptAssetId = data.scriptAssetId;
    } else if (data.type === 'BoxCollider2D') {
      const collider = obj.addComponent(new BoxCollider2D());
      collider.enabled = data.enabled;
      collider.width = data.width;
      collider.height = data.height;
      collider.offset.set(data.offset.x, data.offset.y);
      collider.isTrigger = data.isTrigger;
    } else if (data.type === 'Rigidbody2D') {
      const body = obj.addComponent(new Rigidbody2D());
      body.enabled = data.enabled;
      body.velocity.set(data.velocity.x, data.velocity.y);
      body.gravityScale = data.gravityScale;
      body.isKinematic = data.isKinematic;
    } else if (data.type === 'AudioSource') {
      const audio = obj.addComponent(new AudioSource());
      audio.enabled = data.enabled;
      audio.audioAssetId = data.audioAssetId;
      audio.volume = data.volume;
      audio.loop = data.loop;
      audio.playOnAwake = data.playOnAwake;
    }
  }
}

export function instantiateSerializedGameObject(
  scene: Scene,
  data: SerializedGameObject,
  parent: GameObject | null,
): GameObject {
  const obj = new GameObject(data.name, data.id);
  obj.scene = scene;
  obj.active = data.active;
  obj.transform.localPosition.set(
    data.transform.localPosition.x,
    data.transform.localPosition.y,
  );
  obj.transform.localRotation = data.transform.localRotation;
  obj.transform.localScale.set(
    data.transform.localScale.x,
    data.transform.localScale.y,
  );

  if (parent) {
    obj.setParent(parent);
  } else {
    scene.rootObjects.push(obj);
  }

  applyComponents(obj, data.components);

  for (const child of data.children) {
    instantiateSerializedGameObject(scene, child, obj);
  }

  return obj;
}

function deserializeGameObject(
  scene: Scene,
  data: SerializedGameObject,
  parent: GameObject | null,
): GameObject {
  return instantiateSerializedGameObject(scene, data, parent);
}

export function deserializeScene(data: SerializedScene): Scene {
  const scene = new Scene(data.name);
  for (const root of data.rootObjects) {
    deserializeGameObject(scene, root, null);
  }
  return scene;
}
