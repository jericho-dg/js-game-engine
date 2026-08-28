import { describe, expect, it } from 'vitest';
import { BoxCollider2D } from '../components/BoxCollider2D';
import { Rigidbody2D } from '../components/Rigidbody2D';
import { Scene } from '../core/Scene';
import { deserializeScene, serializeScene } from '../serialization/sceneSerialization';

describe('sceneSerialization physics', () => {
  it('round-trips BoxCollider2D and Rigidbody2D', () => {
    const scene = new Scene('Test');
    const obj = scene.createGameObject('PhysicsObject');
    obj.transform.localPosition.set(4, 8);

    const collider = obj.addComponent(new BoxCollider2D());
    collider.width = 32;
    collider.height = 16;
    collider.offset.set(1, 2);
    collider.isTrigger = true;

    const body = obj.addComponent(new Rigidbody2D());
    body.velocity.set(3, -4);
    body.gravityScale = 0.5;
    body.isKinematic = true;

    const restored = deserializeScene(serializeScene(scene));
    const restoredObj = restored.rootObjects[0];
    const restoredCollider = restoredObj.getComponent(BoxCollider2D)!;
    const restoredBody = restoredObj.getComponent(Rigidbody2D)!;

    expect(restoredCollider.width).toBe(32);
    expect(restoredCollider.height).toBe(16);
    expect(restoredCollider.offset.x).toBe(1);
    expect(restoredCollider.isTrigger).toBe(true);
    expect(restoredBody.velocity.x).toBe(3);
    expect(restoredBody.gravityScale).toBe(0.5);
    expect(restoredBody.isKinematic).toBe(true);
  });
});

describe('BoxCollider2D', () => {
  it('computes world bounds from transform', () => {
    const scene = new Scene('Test');
    const obj = scene.createGameObject('Box');
    obj.transform.localPosition.set(10, 20);
    const collider = obj.addComponent(new BoxCollider2D());
    collider.width = 10;
    collider.height = 10;

    const bounds = collider.getWorldBounds();
    expect(bounds.minX).toBe(5);
    expect(bounds.maxX).toBe(15);
    expect(bounds.minY).toBe(15);
    expect(bounds.maxY).toBe(25);
  });
});
