import { Color } from '@js-game-engine/shared';
import { Camera2D } from '../components/Camera2D';
import { SpriteRenderer } from '../components/SpriteRenderer';
import { TilemapRenderer } from '../components/TilemapRenderer';
import type { Scene } from '../core/Scene';
import type { GameObject } from '../core/GameObject';

export interface Canvas2DRendererOptions {
  showGrid?: boolean;
}

interface Drawable {
  sortingOrder: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

const TILE_FALLBACK_COLORS = [
  '#66bb6a',
  '#42a5f5',
  '#ffb74d',
  '#ab47bc',
  '#ef5350',
  '#78909c',
];

export class Canvas2DRenderer {
  constructor(private readonly options: Canvas2DRendererOptions = {}) {}

  render(
    ctx: CanvasRenderingContext2D,
    scene: Scene,
    width: number,
    height: number,
  ): void {
    const camera = this.findCamera(scene);
    const background = camera?.backgroundColor ?? Color.fromHex('#1a1a2e');

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = background.toCss();
    ctx.fillRect(0, 0, width, height);

    ctx.translate(width / 2, height / 2);

    const zoom = camera?.zoom ?? 1;
    ctx.scale(zoom, -zoom);

    if (camera) {
      ctx.translate(-camera.position.x, -camera.position.y);
    }

    if (this.options.showGrid) {
      this.drawGrid(ctx, width, height, zoom, camera?.position);
    }

    const drawables = this.collectDrawables(scene);
    for (const drawable of drawables) {
      drawable.draw(ctx);
    }

    ctx.restore();
  }

  private findCamera(scene: Scene): Camera2D | null {
    for (const root of scene.rootObjects) {
      const camera = this.findCameraRecursive(root);
      if (camera) return camera;
    }
    return null;
  }

  private findCameraRecursive(obj: GameObject): Camera2D | null {
    const camera = obj.getComponent(Camera2D);
    if (camera?.enabled) return camera;
    for (const child of obj.children) {
      const found = this.findCameraRecursive(child);
      if (found) return found;
    }
    return null;
  }

  private collectDrawables(scene: Scene): Drawable[] {
    const results: Drawable[] = [];
    for (const root of scene.rootObjects) {
      this.collectDrawablesRecursive(root, results);
    }
    results.sort((a, b) => a.sortingOrder - b.sortingOrder);
    return results;
  }

  private collectDrawablesRecursive(obj: GameObject, results: Drawable[]): void {
    if (!obj.active) return;

    for (const tilemap of obj.getComponents(TilemapRenderer)) {
      if (tilemap.enabled) {
        results.push({
          sortingOrder: tilemap.sortingOrder,
          draw: (ctx) => this.drawTilemap(ctx, obj, tilemap),
        });
      }
    }

    for (const sprite of obj.getComponents(SpriteRenderer)) {
      if (sprite.enabled) {
        results.push({
          sortingOrder: sprite.sortingOrder,
          draw: (ctx) => this.drawSprite(ctx, obj, sprite),
        });
      }
    }

    for (const child of obj.children) {
      this.collectDrawablesRecursive(child, results);
    }
  }

  private drawTilemap(
    ctx: CanvasRenderingContext2D,
    obj: GameObject,
    tilemap: TilemapRenderer,
  ): void {
    const transform = obj.transform;
    const pos = transform.worldPosition;
    const rotation = transform.worldRotation;
    const scale = transform.worldScale;

    tilemap.ensureTileBuffer();

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(rotation);
    ctx.scale(scale.x, scale.y);

    const columns = tilemap.getTilesetColumns();

    for (let row = 0; row < tilemap.mapHeight; row++) {
      for (let column = 0; column < tilemap.mapWidth; column++) {
        const tileIndex = tilemap.getTile(column, row);
        if (tileIndex < 0) continue;

        const x = column * tilemap.tileWidth;
        const y = row * tilemap.tileHeight;

        if (tilemap.image) {
          const source = tilemap.image;
          const tileColumn = tileIndex % columns;
          const tileRow = Math.floor(tileIndex / columns);
          const sx = tileColumn * tilemap.tileWidth;
          const sy = tileRow * tilemap.tileHeight;

          ctx.drawImage(
            source,
            sx,
            sy,
            tilemap.tileWidth,
            tilemap.tileHeight,
            x,
            y,
            tilemap.tileWidth,
            tilemap.tileHeight,
          );
        } else {
          ctx.fillStyle = TILE_FALLBACK_COLORS[tileIndex % TILE_FALLBACK_COLORS.length];
          ctx.fillRect(x, y, tilemap.tileWidth, tilemap.tileHeight);
        }
      }
    }

    ctx.restore();
  }

  private drawSprite(
    ctx: CanvasRenderingContext2D,
    obj: GameObject,
    sprite: SpriteRenderer,
  ): void {
    const transform = obj.transform;
    const pos = transform.worldPosition;
    const rotation = transform.worldRotation;
    const scale = transform.worldScale;

    const width = sprite.width * Math.abs(scale.x);
    const height = sprite.height * Math.abs(scale.y);
    const pivotX = sprite.pivot.x * width;
    const pivotY = sprite.pivot.y * height;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(rotation);
    if (sprite.flipX) ctx.scale(-1, 1);
    if (sprite.flipY) ctx.scale(1, -1);
    ctx.translate(-pivotX, -pivotY);

    if (sprite.image) {
      const source = sprite.image;
      const imageWidth = 'width' in source ? Number(source.width) : sprite.width;
      const imageHeight = 'height' in source ? Number(source.height) : sprite.height;
      const sx = sprite.sourceRect.x * imageWidth;
      const sy = sprite.sourceRect.y * imageHeight;
      const sw = sprite.sourceRect.width * imageWidth;
      const sh = sprite.sourceRect.height * imageHeight;

      ctx.globalAlpha = sprite.tint.a;
      ctx.drawImage(source, sx, sy, sw, sh, 0, 0, width, height);
    } else {
      ctx.fillStyle = sprite.color.toCss();
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  }

  private drawGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    zoom: number,
    cameraPosition?: { x: number; y: number },
  ): void {
    const gridSize = 32;
    const halfW = width / 2 / zoom;
    const halfH = height / 2 / zoom;
    const cx = cameraPosition?.x ?? 0;
    const cy = cameraPosition?.y ?? 0;

    const startX = Math.floor((cx - halfW) / gridSize) * gridSize;
    const endX = Math.ceil((cx + halfW) / gridSize) * gridSize;
    const startY = Math.floor((cy - halfH) / gridSize) * gridSize;
    const endY = Math.ceil((cy + halfH) / gridSize) * gridSize;

    ctx.strokeStyle = 'rgba(42, 42, 62, 0.8)';
    ctx.lineWidth = 1 / zoom;

    for (let x = startX; x <= endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(74, 74, 106, 0.9)';
    ctx.lineWidth = 2 / zoom;
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(endX, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, startY);
    ctx.lineTo(0, endY);
    ctx.stroke();
  }
}
