import { describe, expect, it } from 'vitest';
import { Scene } from './Scene';
import { SpriteRenderer } from '../components/SpriteRenderer';

describe('Scene', () => {
  it('creates root game objects', () => {
    const scene = new Scene();
    const obj = scene.createGameObject('Player');
    expect(scene.rootObjects).toHaveLength(1);
    expect(obj.name).toBe('Player');
    expect(obj.scene).toBe(scene);
  });

  it('parents objects and finds by name', () => {
    const scene = new Scene();
    const parent = scene.createGameObject('Parent');
    const child = scene.createGameObject('Child', parent);
    expect(parent.children).toContain(child);
    expect(scene.rootObjects).toHaveLength(1);
    expect(scene.findByName('Child')).toBe(child);
  });

  it('queues and processes destroy', () => {
    const scene = new Scene();
    scene.start();
    const obj = scene.createGameObject('Temp');
    obj.addComponent(new SpriteRenderer());
    obj.destroy();
    scene.update(0.016);
    expect(scene.rootObjects).toHaveLength(0);
  });
});
