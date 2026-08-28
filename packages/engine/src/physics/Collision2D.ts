import type { GameObject } from '../core/GameObject';
import type { BoxCollider2D } from '../components/BoxCollider2D';

/** Passed to collision and trigger callbacks in scripts. */
export class Collision2D {
  readonly gameObject: GameObject;
  readonly collider: BoxCollider2D;

  constructor(gameObject: GameObject, collider: BoxCollider2D) {
    this.gameObject = gameObject;
    this.collider = collider;
  }
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function boundsOverlap(a: Bounds, b: Bounds): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

export function boundsCenter(bounds: Bounds): { x: number; y: number } {
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
}

/** Smallest separation vector to resolve overlap (world space). */
export function separationVector(a: Bounds, b: Bounds): { x: number; y: number } {
  const overlapX = Math.min(a.maxX - b.minX, b.maxX - a.minX);
  const overlapY = Math.min(a.maxY - b.minY, b.maxY - a.minY);

  if (overlapX < overlapY) {
    const centerA = boundsCenter(a).x;
    const centerB = boundsCenter(b).x;
    const direction = centerA < centerB ? -1 : 1;
    return { x: direction * overlapX, y: 0 };
  }

  const centerA = boundsCenter(a).y;
  const centerB = boundsCenter(b).y;
  const direction = centerA < centerB ? -1 : 1;
  return { x: 0, y: direction * overlapY };
}
