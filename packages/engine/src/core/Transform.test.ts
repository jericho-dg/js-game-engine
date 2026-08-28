import { describe, expect, it } from 'vitest';
import { Vector2 } from '@js-game-engine/shared';
import { Scene } from './Scene';

describe('Transform hierarchy', () => {
  it('computes world position from parent transform', () => {
    const scene = new Scene();
    const parent = scene.createGameObject('Parent');
    parent.transform.localPosition.set(10, 0);
    parent.transform.localRotation = Math.PI / 2;

    const child = scene.createGameObject('Child', parent);
    child.transform.localPosition.set(0, 5);

    const world = child.transform.worldPosition;
    expect(world.x).toBeCloseTo(5);
    expect(world.y).toBeCloseTo(0);
  });

  it('sets world position through parent inverse transform', () => {
    const scene = new Scene();
    const parent = scene.createGameObject('Parent');
    parent.transform.localPosition.set(100, 50);

    const child = scene.createGameObject('Child', parent);
    child.transform.position = new Vector2(110, 60);

    expect(child.transform.localPosition.x).toBeCloseTo(10);
    expect(child.transform.localPosition.y).toBeCloseTo(10);
  });
});
