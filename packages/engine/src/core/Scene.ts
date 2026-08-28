import { GameObject } from './GameObject';
import { PhysicsWorld } from '../physics/PhysicsWorld';

export class Scene {
  readonly name: string;
  readonly rootObjects: GameObject[] = [];
  readonly physicsWorld: PhysicsWorld;
  isRunning = false;
  private destroyQueue: GameObject[] = [];

  constructor(name = 'Scene') {
    this.name = name;
    this.physicsWorld = new PhysicsWorld(this);
  }

  createGameObject(name: string, parent?: GameObject | null): GameObject {
    const obj = new GameObject(name);
    obj.scene = this;
    if (parent) {
      obj.setParent(parent);
    } else {
      this.rootObjects.push(obj);
    }
    if (this.isRunning) {
      obj.internalAwake();
      obj.internalStart();
    }
    return obj;
  }

  queueDestroy(obj: GameObject): void {
    if (!this.destroyQueue.includes(obj)) {
      this.destroyQueue.push(obj);
    }
  }

  removeFromRoots(obj: GameObject): void {
    const index = this.rootObjects.indexOf(obj);
    if (index !== -1) {
      this.rootObjects.splice(index, 1);
    }
  }

  findByName(name: string): GameObject | null {
    for (const root of this.rootObjects) {
      const found = this.findByNameRecursive(root, name);
      if (found) return found;
    }
    return null;
  }

  private findByNameRecursive(obj: GameObject, name: string): GameObject | null {
    if (obj.name === name) return obj;
    for (const child of obj.children) {
      const found = this.findByNameRecursive(child, name);
      if (found) return found;
    }
    return null;
  }

  start(): void {
    this.isRunning = true;
    this.physicsWorld.reset();
    for (const root of this.rootObjects) {
      root.internalAwake();
      root.internalStart();
    }
  }

  stop(): void {
    this.isRunning = false;
    this.physicsWorld.reset();
  }

  update(deltaTime: number): void {
    for (const root of this.rootObjects) {
      root.internalUpdate(deltaTime);
    }
    this.processDestroyQueue();
  }

  fixedUpdate(fixedDeltaTime: number): void {
    for (const root of this.rootObjects) {
      root.internalFixedUpdate(fixedDeltaTime);
    }
    this.physicsWorld.step(fixedDeltaTime);
    this.processDestroyQueue();
  }

  private processDestroyQueue(): void {
    while (this.destroyQueue.length > 0) {
      const obj = this.destroyQueue.shift()!;
      obj.internalDestroy();
    }
  }
}
