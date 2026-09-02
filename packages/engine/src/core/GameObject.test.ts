import { describe, expect, it } from 'vitest';
import { Scene } from './Scene';
import { SpriteRenderer } from '../components/SpriteRenderer';
import { BoxCollider2D } from '../components/BoxCollider2D';

describe('GameObject components', () => {
  it('removes removable components via component.remove()', () => {
    const scene = new Scene();
    const obj = scene.createGameObject('Test');
    const sprite = obj.addComponent(new SpriteRenderer());

    expect(sprite.remove()).toBe(true);
    expect(obj.getComponent(SpriteRenderer)).toBeNull();
  });

  it('does not remove the transform', () => {
    const scene = new Scene();
    const obj = scene.createGameObject('Test');

    expect(obj.transform.removable).toBe(false);
    expect(obj.transform.remove()).toBe(false);
    expect(obj.transform).toBeTruthy();
  });

  it('removeComponentInstance removes a specific component', () => {
    const scene = new Scene();
    const obj = scene.createGameObject('Test');
    const sprite = obj.addComponent(new SpriteRenderer());
    const collider = obj.addComponent(new BoxCollider2D());

    expect(obj.removeComponentInstance(sprite)).toBe(true);
    expect(obj.getComponent(SpriteRenderer)).toBeNull();
    expect(obj.getComponent(BoxCollider2D)).toBe(collider);
  });
});
