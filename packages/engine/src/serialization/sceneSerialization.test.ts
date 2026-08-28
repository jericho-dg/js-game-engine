import { describe, expect, it } from 'vitest';
import { Color } from '@js-game-engine/shared';
import { Scene } from '../core/Scene';
import { SpriteRenderer } from '../components/SpriteRenderer';
import { deserializeScene, serializeScene } from './sceneSerialization';

describe('sceneSerialization', () => {
  it('round-trips a scene with hierarchy and components', () => {
    const scene = new Scene('Test');
    const parent = scene.createGameObject('Parent');
    parent.transform.localPosition.set(10, 20);

    const child = scene.createGameObject('Child', parent);
    const sprite = child.addComponent(new SpriteRenderer());
    sprite.color = Color.fromHex('#ff0000');
    sprite.width = 32;
    sprite.height = 32;
    sprite.spriteAssetId = 'asset-1';

    const json = serializeScene(scene);
    const restored = deserializeScene(json);

    expect(restored.name).toBe('Test');
    expect(restored.rootObjects).toHaveLength(1);
    expect(restored.rootObjects[0].children).toHaveLength(1);
    expect(restored.rootObjects[0].children[0].name).toBe('Child');
    expect(restored.rootObjects[0].children[0].getComponent(SpriteRenderer)?.spriteAssetId).toBe(
      'asset-1',
    );
  });
});
