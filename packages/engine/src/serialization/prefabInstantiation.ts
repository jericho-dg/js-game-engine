import type { SerializedGameObject } from '@js-game-engine/shared';
import { generateId } from '../util/id';
import type { Scene } from '../core/Scene';
import type { GameObject } from '../core/GameObject';
import { instantiateSerializedGameObject } from './sceneSerialization';

export function cloneSerializedGameObjectWithNewIds(
  data: SerializedGameObject,
): SerializedGameObject {
  const idMap = new Map<string, string>();

  function remap(node: SerializedGameObject): SerializedGameObject {
    let nextId = idMap.get(node.id);
    if (!nextId) {
      nextId = generateId();
      idMap.set(node.id, nextId);
    }

    return {
      ...node,
      id: nextId,
      children: node.children.map(remap),
    };
  }

  return remap(data);
}

export function instantiatePrefabRoot(
  scene: Scene,
  data: SerializedGameObject,
  parent: GameObject | null = null,
): GameObject {
  const cloned = cloneSerializedGameObjectWithNewIds(data);
  return instantiateSerializedGameObject(scene, cloned, parent);
}
