import { BoxCollider2D } from '../components/BoxCollider2D';
import { Rigidbody2D } from '../components/Rigidbody2D';
import { ScriptComponent } from '../components/ScriptComponent';
import type { GameObject } from '../core/GameObject';
import type { Scene } from '../core/Scene';
import {
  boundsOverlap,
  Collision2D,
  minimumTranslationVector,
  type Bounds,
} from './Collision2D';

const GRAVITY = -980;
const SOLVER_ITERATIONS = 4;

interface ColliderEntry {
  object: GameObject;
  collider: BoxCollider2D;
  bounds: Bounds;
  rigidbody: Rigidbody2D | null;
}

function pairKey(idA: string, idB: string): string {
  return idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
}

export class PhysicsWorld {
  private readonly scene: Scene;
  private activeTriggerPairs = new Set<string>();
  private activeCollisionPairs = new Set<string>();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  reset(): void {
    this.activeTriggerPairs.clear();
    this.activeCollisionPairs.clear();
  }

  step(fixedDeltaTime: number): void {
    const entries = collectColliders(this.scene);
    integrateRigidbodies(entries, fixedDeltaTime);
    refreshBounds(entries);

    const nextTriggerPairs = new Set<string>();
    const nextCollisionPairs = new Set<string>();

    for (let iteration = 0; iteration < SOLVER_ITERATIONS; iteration++) {
      let resolvedAny = false;

      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
          const a = entries[i];
          const b = entries[j];
          refreshBounds([a, b]);
          if (!boundsOverlap(a.bounds, b.bounds)) continue;

          const key = pairKey(a.object.id, b.object.id);
          const isTrigger = a.collider.isTrigger || b.collider.isTrigger;

          if (isTrigger) {
            if (iteration === 0) {
              nextTriggerPairs.add(key);
              if (!this.activeTriggerPairs.has(key)) {
                dispatchTriggerEnter(a, b);
              }
            }
          } else {
            if (resolveSolidOverlap(a, b)) {
              resolvedAny = true;
              refreshBounds(entries);
            }
            if (iteration === 0) {
              nextCollisionPairs.add(key);
              if (!this.activeCollisionPairs.has(key)) {
                dispatchCollisionEnter(a, b);
              }
            }
          }
        }
      }

      if (!resolvedAny) break;
    }

    for (const key of this.activeTriggerPairs) {
      if (!nextTriggerPairs.has(key)) {
        dispatchTriggerExit(entries, key);
      }
    }

    for (const key of this.activeCollisionPairs) {
      if (!nextCollisionPairs.has(key)) {
        dispatchCollisionExit(entries, key);
      }
    }

    this.activeTriggerPairs = nextTriggerPairs;
    this.activeCollisionPairs = nextCollisionPairs;
  }
}

function collectColliders(scene: Scene): ColliderEntry[] {
  const entries: ColliderEntry[] = [];
  for (const root of scene.rootObjects) {
    collectFromObject(root, entries);
  }
  return entries;
}

function collectFromObject(obj: GameObject, entries: ColliderEntry[]): void {
  if (!obj.active || obj.isDestroyed) return;

  for (const collider of obj.getComponents(BoxCollider2D)) {
    if (!collider.enabled) continue;
    entries.push({
      object: obj,
      collider,
      bounds: collider.getWorldBounds(),
      rigidbody: obj.getComponent(Rigidbody2D),
    });
  }

  for (const child of obj.children) {
    collectFromObject(child, entries);
  }
}

function refreshBounds(entries: ColliderEntry[]): void {
  for (const entry of entries) {
    entry.bounds = entry.collider.getWorldBounds();
  }
}

function integrateRigidbodies(entries: ColliderEntry[], dt: number): void {
  for (const entry of entries) {
    const body = entry.rigidbody;
    if (!body || !body.enabled || body.isKinematic) continue;

    body.velocity.y += GRAVITY * body.gravityScale * dt;
    const pos = entry.object.transform.position;
    entry.object.transform.position = pos.add(body.velocity.scale(dt));
  }
}

function resolveSolidOverlap(a: ColliderEntry, b: ColliderEntry): boolean {
  const mtvForA = minimumTranslationVector(a.bounds, b.bounds);
  const mtvForB = minimumTranslationVector(b.bounds, a.bounds);
  const aDynamic = a.rigidbody && a.rigidbody.enabled && !a.rigidbody.isKinematic;
  const bDynamic = b.rigidbody && b.rigidbody.enabled && !b.rigidbody.isKinematic;

  if (!aDynamic && !bDynamic) return false;

  if (aDynamic && bDynamic) {
    moveObject(a.object, mtvForA.x / 2, mtvForA.y / 2);
    moveObject(b.object, mtvForB.x / 2, mtvForB.y / 2);
    cancelApproachVelocity(a.rigidbody!, mtvForA.x / 2, mtvForA.y / 2);
    cancelApproachVelocity(b.rigidbody!, mtvForB.x / 2, mtvForB.y / 2);
    return true;
  }

  if (aDynamic) {
    moveObject(a.object, mtvForA.x, mtvForA.y);
    cancelApproachVelocity(a.rigidbody!, mtvForA.x, mtvForA.y);
    return true;
  }

  moveObject(b.object, mtvForB.x, mtvForB.y);
  cancelApproachVelocity(b.rigidbody!, mtvForB.x, mtvForB.y);
  return true;
}

function cancelApproachVelocity(body: Rigidbody2D, sepX: number, sepY: number): void {
  if (Math.abs(sepY) >= Math.abs(sepX)) {
    if (sepY > 0 && body.velocity.y < 0) body.velocity.y = 0;
    if (sepY < 0 && body.velocity.y > 0) body.velocity.y = 0;
    return;
  }

  if (sepX > 0 && body.velocity.x < 0) body.velocity.x = 0;
  if (sepX < 0 && body.velocity.x > 0) body.velocity.x = 0;
}

function moveObject(obj: GameObject, dx: number, dy: number): void {
  const pos = obj.transform.position;
  pos.x += dx;
  pos.y += dy;
  obj.transform.position = pos;
}

function dispatchTriggerEnter(a: ColliderEntry, b: ColliderEntry): void {
  dispatchToScripts(a.object, new Collision2D(b.object, b.collider), 'onTriggerEnter');
  dispatchToScripts(b.object, new Collision2D(a.object, a.collider), 'onTriggerEnter');
}

function dispatchTriggerExit(entries: ColliderEntry[], key: string): void {
  const [idA, idB] = key.split('|');
  const a = entries.find((entry) => entry.object.id === idA);
  const b = entries.find((entry) => entry.object.id === idB);
  if (!a || !b) return;
  dispatchToScripts(a.object, new Collision2D(b.object, b.collider), 'onTriggerExit');
  dispatchToScripts(b.object, new Collision2D(a.object, a.collider), 'onTriggerExit');
}

function dispatchCollisionEnter(a: ColliderEntry, b: ColliderEntry): void {
  dispatchToScripts(a.object, new Collision2D(b.object, b.collider), 'onCollisionEnter');
  dispatchToScripts(b.object, new Collision2D(a.object, a.collider), 'onCollisionEnter');
}

function dispatchCollisionExit(entries: ColliderEntry[], key: string): void {
  const [idA, idB] = key.split('|');
  const a = entries.find((entry) => entry.object.id === idA);
  const b = entries.find((entry) => entry.object.id === idB);
  if (!a || !b) return;
  dispatchToScripts(a.object, new Collision2D(b.object, b.collider), 'onCollisionExit');
  dispatchToScripts(b.object, new Collision2D(a.object, a.collider), 'onCollisionExit');
}

type ScriptCollisionMethod =
  | 'onTriggerEnter'
  | 'onTriggerExit'
  | 'onCollisionEnter'
  | 'onCollisionExit';

function dispatchToScripts(
  object: GameObject,
  collision: Collision2D,
  method: ScriptCollisionMethod,
): void {
  for (const script of object.getComponents(ScriptComponent)) {
    script.dispatchPhysicsEvent(method, collision);
  }
}
