import { Vector2 } from '@js-game-engine/shared';
import { Camera2D } from '../components/Camera2D';
import type { GameObject } from '../core/GameObject';
import type { Scene } from '../core/Scene';

export interface CameraState {
  zoom: number;
  position: Vector2;
}

export function getSceneCamera(scene: Scene): CameraState {
  for (const root of scene.rootObjects) {
    const camera = findCameraRecursive(root);
    if (camera) {
      return { zoom: camera.zoom, position: camera.position.clone() };
    }
  }
  return { zoom: 1, position: Vector2.zero() };
}

function findCameraRecursive(obj: GameObject): Camera2D | null {
  const camera = obj.getComponent(Camera2D);
  if (camera?.enabled) return camera;
  for (const child of obj.children) {
    const found = findCameraRecursive(child);
    if (found) return found;
  }
  return null;
}

export function screenToWorld(
  screenX: number,
  screenY: number,
  viewportWidth: number,
  viewportHeight: number,
  camera: CameraState,
): Vector2 {
  const x = (screenX - viewportWidth / 2) / camera.zoom + camera.position.x;
  const y = -(screenY - viewportHeight / 2) / camera.zoom + camera.position.y;
  return new Vector2(x, y);
}

export function worldToScreen(
  worldX: number,
  worldY: number,
  viewportWidth: number,
  viewportHeight: number,
  camera: CameraState,
): Vector2 {
  const x = (worldX - camera.position.x) * camera.zoom + viewportWidth / 2;
  const y = -(worldY - camera.position.y) * camera.zoom + viewportHeight / 2;
  return new Vector2(x, y);
}
