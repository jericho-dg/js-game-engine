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
import { GameObject } from '../core/GameObject';
import { Scene } from '../core/Scene';

function colorToHex(color: Color): string {
  const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function serializeGameObject(obj: GameObject): SerializedGameObject {
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
    } else if (data.type === 'Rotator') {
      const rotator = obj.addComponent(new Rotator());
      rotator.enabled = data.enabled;
      rotator.speed = data.speed;
    } else if (data.type === 'ScriptComponent') {
      const script = obj.addComponent(new ScriptComponent());
      script.enabled = data.enabled;
      script.scriptAssetId = data.scriptAssetId;
    }
  }
}

function deserializeGameObject(
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
    deserializeGameObject(scene, child, obj);
  }

  return obj;
}

export function deserializeScene(data: SerializedScene): Scene {
  const scene = new Scene(data.name);
  for (const root of data.rootObjects) {
    deserializeGameObject(scene, root, null);
  }
  return scene;
}
