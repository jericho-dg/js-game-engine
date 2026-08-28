import { SpriteRenderer, type GameObject, type Scene } from '@js-game-engine/engine';
import { Vector2 } from '@js-game-engine/shared';

export function hitTestScene(scene: Scene, worldPoint: Vector2): GameObject | null {
  const sprites: Array<{ obj: GameObject; sprite: SpriteRenderer }> = [];
  for (const root of scene.rootObjects) {
    collectSprites(root, sprites);
  }
  sprites.sort((a, b) => b.sprite.sortingOrder - a.sprite.sortingOrder);

  for (const { obj, sprite } of sprites) {
    if (pointInSprite(worldPoint, obj, sprite)) return obj;
  }
  return null;
}

function collectSprites(
  obj: GameObject,
  results: Array<{ obj: GameObject; sprite: SpriteRenderer }>,
): void {
  if (!obj.active) return;
  for (const sprite of obj.getComponents(SpriteRenderer)) {
    if (sprite.enabled) results.push({ obj, sprite });
  }
  for (const child of obj.children) {
    collectSprites(child, results);
  }
}

function pointInSprite(
  worldPoint: Vector2,
  obj: GameObject,
  sprite: SpriteRenderer,
): boolean {
  const transform = obj.transform;
  const pos = transform.worldPosition;
  const rot = -transform.worldRotation;
  const scale = transform.worldScale;

  const dx = worldPoint.x - pos.x;
  const dy = worldPoint.y - pos.y;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const localX = (dx * cos - dy * sin) / (scale.x || 1);
  const localY = (dx * sin + dy * cos) / (scale.y || 1);

  const width = sprite.width;
  const height = sprite.height;
  const pivotX = sprite.pivot.x * width;
  const pivotY = sprite.pivot.y * height;

  return (
    localX >= -pivotX &&
    localX <= width - pivotX &&
    localY >= -pivotY &&
    localY <= height - pivotY
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
