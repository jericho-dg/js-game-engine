import { Color, Vector2 } from '@js-game-engine/shared';
import { Component } from '../core/Component';

export type SpriteSource = CanvasImageSource;

export class SpriteRenderer extends Component {
  static override readonly editorDisplayName = 'Sprite Renderer';
  /** Image to draw. When null, a colored quad is rendered instead. */
  image: SpriteSource | null = null;
  color = Color.fromHex('#4fc3f7');
  width = 64;
  height = 64;
  tint = Color.white();
  flipX = false;
  flipY = false;
  sortingOrder = 0;
  /** Reference to imported asset; image is hydrated from the asset cache at runtime. */
  spriteAssetId: string | null = null;
  /** Normalized source rect within the image (0–1). */
  sourceRect = { x: 0, y: 0, width: 1, height: 1 };
  /** Local-space pivot (0–1). */
  pivot = new Vector2(0.5, 0.5);
}
