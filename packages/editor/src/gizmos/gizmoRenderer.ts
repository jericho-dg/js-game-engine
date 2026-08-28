import type { GameObject, Scene } from '@js-game-engine/engine';
import type { CameraState } from '@js-game-engine/engine';
import { BoxCollider2D } from '@js-game-engine/engine';
import { getSpriteBounds } from './hitTest';

export function drawColliderGizmos(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  camera: CameraState,
  viewportWidth: number,
  viewportHeight: number,
): void {
  ctx.save();
  ctx.translate(viewportWidth / 2, viewportHeight / 2);
  ctx.scale(camera.zoom, -camera.zoom);
  ctx.translate(-camera.position.x, -camera.position.y);

  for (const root of scene.rootObjects) {
    drawObjectColliders(ctx, root, camera);
  }

  ctx.restore();
}

function drawObjectColliders(
  ctx: CanvasRenderingContext2D,
  obj: GameObject,
  camera: CameraState,
): void {
  for (const collider of obj.getComponents(BoxCollider2D)) {
    if (!collider.enabled) continue;
    const bounds = collider.getWorldBounds();
    ctx.strokeStyle = collider.isTrigger ? '#ffca28' : '#66bb6a';
    ctx.lineWidth = 1.5 / camera.zoom;
    ctx.setLineDash(collider.isTrigger ? [4 / camera.zoom, 4 / camera.zoom] : []);
    ctx.strokeRect(
      bounds.minX,
      bounds.minY,
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY,
    );
    ctx.setLineDash([]);
  }

  for (const child of obj.children) {
    drawObjectColliders(ctx, child, camera);
  }
}

export function drawSelectionGizmo(
  ctx: CanvasRenderingContext2D,
  obj: GameObject,
  camera: CameraState,
  viewportWidth: number,
  viewportHeight: number,
): void {
  const bounds = getSpriteBounds(obj);
  if (!bounds) {
    drawTransformCross(ctx, obj, camera, viewportWidth, viewportHeight);
    return;
  }

  ctx.save();
  ctx.translate(viewportWidth / 2, viewportHeight / 2);
  ctx.scale(camera.zoom, -camera.zoom);
  ctx.translate(-camera.position.x, -camera.position.y);

  ctx.strokeStyle = '#00aaff';
  ctx.lineWidth = 2 / camera.zoom;
  ctx.setLineDash([6 / camera.zoom, 4 / camera.zoom]);
  ctx.strokeRect(
    bounds.minX,
    bounds.minY,
    bounds.maxX - bounds.minX,
    bounds.maxY - bounds.minY,
  );
  ctx.setLineDash([]);

  const center = obj.transform.worldPosition;
  const handleSize = 8 / camera.zoom;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#00aaff';
  ctx.lineWidth = 1.5 / camera.zoom;
  ctx.beginPath();
  ctx.rect(
    center.x - handleSize / 2,
    center.y - handleSize / 2,
    handleSize,
    handleSize,
  );
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawTransformCross(
  ctx: CanvasRenderingContext2D,
  obj: GameObject,
  camera: CameraState,
  viewportWidth: number,
  viewportHeight: number,
): void {
  const pos = obj.transform.worldPosition;
  const size = 12 / camera.zoom;

  ctx.save();
  ctx.translate(viewportWidth / 2, viewportHeight / 2);
  ctx.scale(camera.zoom, -camera.zoom);
  ctx.translate(-camera.position.x, -camera.position.y);

  ctx.strokeStyle = '#00aaff';
  ctx.lineWidth = 2 / camera.zoom;
  ctx.beginPath();
  ctx.moveTo(pos.x - size, pos.y);
  ctx.lineTo(pos.x + size, pos.y);
  ctx.moveTo(pos.x, pos.y - size);
  ctx.lineTo(pos.x, pos.y + size);
  ctx.stroke();
  ctx.restore();
}
