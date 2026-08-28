import { Transform } from './Transform';
import { Component } from './Component';
import { generateId } from '../util/id';
import type { Scene } from './Scene';

export class GameObject {
  readonly id: string;
  name: string;
  readonly transform: Transform;
  private readonly components: Component[] = [];
  parent: GameObject | null = null;
  children: GameObject[] = [];
  scene: Scene | null = null;
  active = true;
  private started = false;
  private destroyed = false;

  constructor(name = 'GameObject', id?: string) {
    this.id = id ?? generateId();
    this.name = name;
    this.transform = new Transform();
    this.transform.gameObject = this;
    this.components.push(this.transform);
  }

  get isDestroyed(): boolean {
    return this.destroyed;
  }

  addComponent<T extends Component>(component: T): T {
    component.gameObject = this;
    this.components.push(component);
    if (this.scene?.isRunning) {
      component.onAwake();
    }
    return component;
  }

  getComponent<T extends Component>(type: new (...args: never[]) => T): T | null {
    return (this.components.find((c) => c instanceof type) as T | undefined) ?? null;
  }

  getComponents<T extends Component>(type: new (...args: never[]) => T): T[] {
    return this.components.filter((c) => c instanceof type) as T[];
  }

  getComponentsInChildren<T extends Component>(
    type: new (...args: never[]) => T,
  ): T[] {
    const results: T[] = [];
    this.transform.traverse((obj) => {
      results.push(...obj.getComponents(type));
    });
    return results;
  }

  setParent(parent: GameObject | null): void {
    if (parent === this.parent) return;
    if (parent && this.isAncestorOf(parent)) {
      throw new Error('Cannot parent a GameObject to its descendant.');
    }

    if (this.parent) {
      this.parent.children = this.parent.children.filter((c) => c !== this);
    }

    this.parent = parent;

    if (parent) {
      parent.children.push(this);
    }
  }

  private isAncestorOf(other: GameObject): boolean {
    let current: GameObject | null = other.parent;
    while (current) {
      if (current === this) return true;
      current = current.parent;
    }
    return false;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene?.queueDestroy(this);
  }

  internalDestroy(): void {
    for (const child of [...this.children]) {
      child.internalDestroy();
    }
    for (const component of this.components) {
      component.onDestroy();
    }
    this.setParent(null);
    this.scene?.removeFromRoots(this);
    this.scene = null;
  }

  internalAwake(): void {
    if (this.destroyed) return;
    for (const component of this.components) {
      component.onAwake();
    }
    for (const child of this.children) {
      child.internalAwake();
    }
  }

  internalStart(): void {
    if (this.destroyed || this.started) return;
    this.started = true;
    if (this.active) {
      for (const component of this.components) {
        if (component.enabled) component.onStart();
      }
    }
    for (const child of this.children) {
      child.internalStart();
    }
  }

  internalUpdate(deltaTime: number): void {
    if (this.destroyed || !this.active) return;
    for (const component of this.components) {
      if (component.enabled) component.onUpdate(deltaTime);
    }
    for (const child of this.children) {
      child.internalUpdate(deltaTime);
    }
  }

  internalFixedUpdate(fixedDeltaTime: number): void {
    if (this.destroyed || !this.active) return;
    for (const component of this.components) {
      if (component.enabled) component.onFixedUpdate(fixedDeltaTime);
    }
    for (const child of this.children) {
      child.internalFixedUpdate(fixedDeltaTime);
    }
  }
}
