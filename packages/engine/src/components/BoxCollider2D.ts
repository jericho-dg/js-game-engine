import { Vector2 } from '@js-game-engine/shared';
import { Component } from '../core/Component';
import type { Bounds } from '../physics/Collision2D';

export class BoxCollider2D extends Component {
  width = 1;
  height = 1;
  offset = Vector2.zero();
  isTrigger = false;

  getWorldBounds(): Bounds {
    const transform = this.gameObject.transform;
    const pos = transform.worldPosition;
    const scale = transform.worldScale;
    const w = this.width * Math.abs(scale.x);
    const h = this.height * Math.abs(scale.y);
    const cx = pos.x + this.offset.x;
    const cy = pos.y + this.offset.y;
    const rot = transform.worldRotation;

    if (Math.abs(rot) < 1e-6) {
      return {
        minX: cx - w / 2,
        minY: cy - h / 2,
        maxX: cx + w / 2,
        maxY: cy + h / 2,
      };
    }

    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const hw = w / 2;
    const hh = h / 2;
    const corners = [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh },
    ];

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const corner of corners) {
      const wx = cx + corner.x * cos - corner.y * sin;
      const wy = cy + corner.x * sin + corner.y * cos;
      minX = Math.min(minX, wx);
      minY = Math.min(minY, wy);
      maxX = Math.max(maxX, wx);
      maxY = Math.max(maxY, wy);
    }

    return { minX, minY, maxX, maxY };
  }
}
