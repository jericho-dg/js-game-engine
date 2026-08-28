import { describe, expect, it } from 'vitest';
import { boundsOverlap, separationVector } from '../physics/Collision2D';

describe('Collision2D utils', () => {
  it('detects overlapping bounds', () => {
    expect(
      boundsOverlap(
        { minX: 0, minY: 0, maxX: 10, maxY: 10 },
        { minX: 5, minY: 5, maxX: 15, maxY: 15 },
      ),
    ).toBe(true);
  });

  it('detects separated bounds', () => {
    expect(
      boundsOverlap(
        { minX: 0, minY: 0, maxX: 10, maxY: 10 },
        { minX: 11, minY: 0, maxX: 20, maxY: 10 },
      ),
    ).toBe(false);
  });

  it('returns a separation vector along the smallest overlap axis', () => {
    const sep = separationVector(
      { minX: 0, minY: 0, maxX: 10, maxY: 10 },
      { minX: 8, minY: 0, maxX: 18, maxY: 10 },
    );
    expect(sep.y).toBe(0);
    expect(Math.abs(sep.x)).toBe(2);
  });
});
