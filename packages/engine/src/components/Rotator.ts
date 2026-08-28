import { Component } from '../core/Component';

/** Simple demo component that rotates its GameObject each frame. */
export class Rotator extends Component {
  speed = 1;

  onUpdate(deltaTime: number): void {
    this.gameObject.transform.localRotation += this.speed * deltaTime;
  }
}
