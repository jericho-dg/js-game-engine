import { BoxCollider2D } from '../components/BoxCollider2D';
import { Rigidbody2D } from '../components/Rigidbody2D';
import { AudioSource } from '../components/AudioSource';
import { TextRenderer } from '../components/TextRenderer';
import type { Collision2D } from '../physics/Collision2D';
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

  getRigidbody2D(): Rigidbody2D | null {
    return this.gameObject.getComponent(Rigidbody2D);
  }

  getBoxCollider2D(): BoxCollider2D | null {
    return this.gameObject.getComponent(BoxCollider2D);
  }

  getAudioSource(): AudioSource | null {
    return this.gameObject.getComponent(AudioSource);
  }

  findGameObject(name: string): GameObject | null {
    return this.gameObject.scene?.findByName(name) ?? null;
  }

  getTextRenderer(): TextRenderer | null {
    return this.gameObject.getComponent(TextRenderer);
  }

  onAwake(): void {}
  onStart(): void {}
  onUpdate(_deltaTime: number): void {}
  onFixedUpdate(_fixedDeltaTime: number): void {}
  onDestroy(): void {}

  onCollisionEnter(_collision: Collision2D): void {}
  onCollisionExit(_collision: Collision2D): void {}
  onTriggerEnter(_collision: Collision2D): void {}
  onTriggerExit(_collision: Collision2D): void {}
}
