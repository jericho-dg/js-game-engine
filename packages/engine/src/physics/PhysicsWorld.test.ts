import { describe, expect, it } from 'vitest';
import { BoxCollider2D } from '../components/BoxCollider2D';
import { Rigidbody2D } from '../components/Rigidbody2D';
import { Scene } from '../core/Scene';

describe('PhysicsWorld', () => {
  it('keeps a dynamic body resting on a static collider', () => {
    const scene = new Scene('Test');
    scene.isRunning = true;

    const ground = scene.createGameObject('Ground');
    ground.transform.localPosition.set(0, -120);
    const groundCollider = ground.addComponent(new BoxCollider2D());
    groundCollider.width = 320;
    groundCollider.height = 32;

    const player = scene.createGameObject('Player');
    player.transform.localPosition.set(0, -80);
    const playerCollider = player.addComponent(new BoxCollider2D());
    playerCollider.width = 48;
    playerCollider.height = 48;
    const playerBody = player.addComponent(new Rigidbody2D());

    for (let i = 0; i < 240; i++) {
      scene.fixedUpdate(1 / 60);
    }

    expect(player.transform.position.y).toBeGreaterThan(-120);
    expect(playerBody.velocity.y).toBe(0);
  });
});
