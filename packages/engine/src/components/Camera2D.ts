import { Color, Vector2 } from '@js-game-engine/shared';
import { Component } from '../core/Component';

export class Camera2D extends Component {
  static override readonly editorDisplayName = 'Camera 2D';
  backgroundColor = Color.fromHex('#1a1a2e');
  zoom = 1;
  /** World-space offset applied after centering the viewport. */
  position = Vector2.zero();
}
