import { Color } from '@js-game-engine/shared';
import { Component } from '../core/Component';

export type TextAlignment = 'left' | 'center' | 'right';

export class TextRenderer extends Component {
  static override readonly editorDisplayName = 'Text Renderer';
  text = '';
  fontSize = 24;
  color = Color.fromHex('#ffffff');
  alignment: TextAlignment = 'center';
  sortingOrder = 100;
  /** Local-space offset from the GameObject origin. */
  offsetY = 0;
}
