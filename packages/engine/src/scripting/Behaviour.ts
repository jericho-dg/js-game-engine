import type { GameObject } from '../core/GameObject';
import type { Transform } from '../core/Transform';

/** Base class for user-authored scripts. */
export class Behaviour {
  gameObject!: GameObject;
  transform!: Transform;

  bind(gameObject: GameObject): void {
    this.gameObject = gameObject;
    this.transform = gameObject.transform;
  }

  onAwake(): void {}
  onStart(): void {}
  onUpdate(_deltaTime: number): void {}
  onFixedUpdate(_fixedDeltaTime: number): void {}
  onDestroy(): void {}
}
