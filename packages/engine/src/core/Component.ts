import type { GameObject } from './GameObject';

export abstract class Component {
  gameObject!: GameObject;
  enabled = true;

  onAwake(): void {}
  onStart(): void {}
  onUpdate(_deltaTime: number): void {}
  onFixedUpdate(_fixedDeltaTime: number): void {}
  onDestroy(): void {}
}
