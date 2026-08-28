import { Vector2 } from '@js-game-engine/shared';
import { Component } from '../core/Component';

export class Rigidbody2D extends Component {
  velocity = Vector2.zero();
  gravityScale = 1;
  isKinematic = false;
}
