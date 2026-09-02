import { describe, expect, it } from 'vitest';
import { Color } from '@js-game-engine/shared';
import { Scene } from '../core/Scene';
import { SpriteRenderer } from '../components/SpriteRenderer';
import { TilemapRenderer } from '../components/TilemapRenderer';
import {
  deserializeScene,
  serializeGameObject,
  serializeScene,
} from './sceneSerialization';
import {
  cloneSerializedGameObjectWithNewIds,
  instantiatePrefabRoot,
} from './prefabInstantiation';

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

  it('round-trips tilemap renderer data', () => {
    const scene = new Scene('TilemapTest');
    const tilemapObject = scene.createGameObject('Ground');
    const tilemap = tilemapObject.addComponent(new TilemapRenderer());
    tilemap.tilesetAssetId = 'tileset-1';
    tilemap.mapWidth = 4;
    tilemap.mapHeight = 3;
    tilemap.tiles = [0, 1, -1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    tilemap.sortingOrder = -5;

    const restored = deserializeScene(serializeScene(scene));
    const restoredTilemap = restored.rootObjects[0].getComponent(TilemapRenderer);

    expect(restoredTilemap?.tilesetAssetId).toBe('tileset-1');
    expect(restoredTilemap?.mapWidth).toBe(4);
    expect(restoredTilemap?.mapHeight).toBe(3);
    expect(restoredTilemap?.tiles).toEqual(tilemap.tiles);
    expect(restoredTilemap?.sortingOrder).toBe(-5);
  });
});

describe('prefabInstantiation', () => {
  it('clones serialized objects with fresh ids', () => {
    const scene = new Scene('PrefabTest');
    const root = scene.createGameObject('Enemy');
    const child = scene.createGameObject('Marker', root);
    child.addComponent(new SpriteRenderer());

    const serialized = serializeGameObject(root);
    const cloned = cloneSerializedGameObjectWithNewIds(serialized);

    expect(cloned.id).not.toBe(serialized.id);
    expect(cloned.children[0].id).not.toBe(serialized.children[0].id);
    expect(cloned.name).toBe('Enemy');
  });

  it('instantiates prefab roots into a scene', () => {
    const sourceScene = new Scene('Source');
    const root = sourceScene.createGameObject('Pickup');
    root.addComponent(new SpriteRenderer());

    const targetScene = new Scene('Target');
    const instance = instantiatePrefabRoot(
      targetScene,
      serializeGameObject(root),
    );

    expect(targetScene.rootObjects).toHaveLength(1);
    expect(instance.name).toBe('Pickup');
    expect(instance.id).not.toBe(root.id);
    expect(instance.getComponent(SpriteRenderer)).not.toBeNull();
  });
});
