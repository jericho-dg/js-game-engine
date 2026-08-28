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

/** Minimum translation vector to move bounds `a` out of overlap with `b`. */
export function minimumTranslationVector(a: Bounds, b: Bounds): { x: number; y: number } {
  const leftPen = a.maxX - b.minX;
  const rightPen = b.maxX - a.minX;
  const downPen = a.maxY - b.minY;
  const upPen = b.maxY - a.minY;

  const options = [
    { x: -leftPen, y: 0, depth: leftPen },
    { x: rightPen, y: 0, depth: rightPen },
    { x: 0, y: -downPen, depth: downPen },
    { x: 0, y: upPen, depth: upPen },
  ].filter((option) => option.depth > 0);

  if (options.length === 0) return { x: 0, y: 0 };

  const best = options.reduce((min, option) => (option.depth < min.depth ? option : min));
  return { x: best.x, y: best.y };
}

/** @deprecated Use minimumTranslationVector */
export function separationVector(a: Bounds, b: Bounds): { x: number; y: number } {
  return minimumTranslationVector(a, b);
}
