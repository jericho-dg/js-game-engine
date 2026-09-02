import type { GameObject } from './GameObject';

export abstract class Component {
  gameObject!: GameObject;
  enabled = true;

  /** Shown in the editor Add Component menu. */
  static readonly editorDisplayName: string = 'Component';

  /** Whether this component can be removed from its GameObject. */
  get removable(): boolean {
    return true;
  }

  /** Remove this component from its GameObject. Returns false if not removable. */
  remove(): boolean {
    if (!this.removable) return false;
    return this.gameObject.removeComponentInstance(this);
  }

  onAwake(): void {}
  onStart(): void {}
  onUpdate(_deltaTime: number): void {}
  onFixedUpdate(_fixedDeltaTime: number): void {}
  onDestroy(): void {}
}
