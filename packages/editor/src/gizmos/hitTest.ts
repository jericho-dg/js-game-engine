import {
  SpriteRenderer,
  TilemapRenderer,
  type GameObject,
  type Scene,
  type Transform,
} from '@js-game-engine/engine';
import { Vector2 } from '@js-game-engine/shared';

export function hitTestScene(scene: Scene, worldPoint: Vector2): GameObject | null {
  const hits: Array<{ obj: GameObject; sortingOrder: number }> = [];

  for (const root of scene.rootObjects) {
    collectHitTargets(root, hits);
  }

  hits.sort((a, b) => b.sortingOrder - a.sortingOrder);

  for (const { obj } of hits) {
    if (pointHitsObject(worldPoint, obj)) return obj;
  }
  return null;
}

function collectHitTargets(
  obj: GameObject,
  results: Array<{ obj: GameObject; sortingOrder: number }>,
): void {
  if (!obj.active) return;

  for (const sprite of obj.getComponents(SpriteRenderer)) {
    if (sprite.enabled) {
      results.push({ obj, sortingOrder: sprite.sortingOrder });
    }
  }

  for (const tilemap of obj.getComponents(TilemapRenderer)) {
    if (tilemap.enabled) {
      results.push({ obj, sortingOrder: tilemap.sortingOrder });
    }
  }

  for (const child of obj.children) {
    collectHitTargets(child, results);
  }
}

function pointHitsObject(worldPoint: Vector2, obj: GameObject): boolean {
  const sprite = obj.getComponent(SpriteRenderer);
  if (sprite?.enabled && pointInSprite(worldPoint, obj, sprite)) {
    return true;
  }

  const tilemap = obj.getComponent(TilemapRenderer);
  if (tilemap?.enabled && pointInTilemap(worldPoint, obj, tilemap)) {
    return true;
  }

  return false;
}

function pointInSprite(
  worldPoint: Vector2,
  obj: GameObject,
  sprite: SpriteRenderer,
): boolean {
  const local = worldToLocal(obj.transform, worldPoint.x, worldPoint.y);
  const width = sprite.width;
  const height = sprite.height;
  const pivotX = sprite.pivot.x * width;
  const pivotY = sprite.pivot.y * height;

  return (
    local.x >= -pivotX &&
    local.x <= width - pivotX &&
    local.y >= -pivotY &&
    local.y <= height - pivotY
  );
}

function pointInTilemap(
  worldPoint: Vector2,
  obj: GameObject,
  tilemap: TilemapRenderer,
): boolean {
  const local = worldToLocal(obj.transform, worldPoint.x, worldPoint.y);
  const bounds = tilemap.getMapLocalBounds();
  return (
    local.x >= 0 &&
    local.y >= 0 &&
    local.x < bounds.width &&
    local.y < bounds.height
  );
}

export function worldToLocalPoint(
  transform: Transform,
  worldPoint: Vector2,
): Vector2 {
  return worldToLocal(transform, worldPoint.x, worldPoint.y);
}

function worldToLocal(
  transform: Transform,
  worldX: number,
  worldY: number,
): Vector2 {
  const pos = transform.worldPosition;
  const rot = -transform.worldRotation;
  const scale = transform.worldScale;
  const dx = worldX - pos.x;
  const dy = worldY - pos.y;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  return new Vector2(
    (dx * cos - dy * sin) / (scale.x || 1),
    (dx * sin + dy * cos) / (scale.y || 1),
  );
}

export function getSpriteBounds(obj: GameObject): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} | null {
  const sprite = obj.getComponent(SpriteRenderer);
  if (!sprite) return null;

  const transform = obj.transform;
  const pos = transform.worldPosition;
  const scale = transform.worldScale;
  const width = sprite.width * Math.abs(scale.x);
  const height = sprite.height * Math.abs(scale.y);
  const pivotX = sprite.pivot.x * width;
  const pivotY = sprite.pivot.y * height;

  const corners = [
    new Vector2(-pivotX, -pivotY),
    new Vector2(width - pivotX, -pivotY),
    new Vector2(width - pivotX, height - pivotY),
    new Vector2(-pivotX, height - pivotY),
  ];

  const rot = transform.worldRotation;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const worldCorners = corners.map((c) => {
    const rx = c.x * cos - c.y * sin;
    const ry = c.x * sin + c.y * cos;
    return new Vector2(pos.x + rx, pos.y + ry);
  });

  const xs = worldCorners.map((c) => c.x);
  const ys = worldCorners.map((c) => c.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}
