import { Vector2 } from '@js-game-engine/shared';
import { Component } from './Component';
import type { GameObject } from './GameObject';

export class Transform extends Component {
  localPosition = Vector2.zero();
  localRotation = 0;
  localScale = Vector2.one();

  get position(): Vector2 {
    return this.worldPosition;
  }

  set position(value: Vector2) {
    if (this.gameObject.parent) {
      this.localPosition = this.worldToLocalPoint(value);
    } else {
      this.localPosition.copyFrom(value);
    }
  }

  get worldPosition(): Vector2 {
    if (this.gameObject.parent) {
      const parent = this.gameObject.parent.transform;
      const cos = Math.cos(parent.worldRotation);
      const sin = Math.sin(parent.worldRotation);
      const scaledX = this.localPosition.x * parent.worldScale.x;
      const scaledY = this.localPosition.y * parent.worldScale.y;
      const rotatedX = scaledX * cos - scaledY * sin;
      const rotatedY = scaledX * sin + scaledY * cos;
      return parent.worldPosition.add(new Vector2(rotatedX, rotatedY));
    }
    return this.localPosition.clone();
  }

  get worldRotation(): number {
    if (this.gameObject.parent) {
      return this.gameObject.parent.transform.worldRotation + this.localRotation;
    }
    return this.localRotation;
  }

  get worldScale(): Vector2 {
    if (this.gameObject.parent) {
      const parent = this.gameObject.parent.transform.worldScale;
      return new Vector2(
        parent.x * this.localScale.x,
        parent.y * this.localScale.y,
      );
    }
    return this.localScale.clone();
  }

  worldToLocalPoint(worldPoint: Vector2): Vector2 {
    const parentPos = this.gameObject.parent?.transform.worldPosition ?? Vector2.zero();
    const dx = worldPoint.x - parentPos.x;
    const dy = worldPoint.y - parentPos.y;
    const parentRot = this.gameObject.parent?.transform.worldRotation ?? 0;
    const cos = Math.cos(-parentRot);
    const sin = Math.sin(-parentRot);
    const rotatedX = dx * cos - dy * sin;
    const rotatedY = dx * sin + dy * cos;
    const parentScale = this.gameObject.parent?.transform.worldScale ?? Vector2.one();
    return new Vector2(rotatedX / parentScale.x, rotatedY / parentScale.y);
  }

  /** Depth-first traversal including this transform's game object. */
  traverse(callback: (obj: GameObject) => void): void {
    callback(this.gameObject);
    for (const child of this.gameObject.children) {
      child.transform.traverse(callback);
    }
  }
}
