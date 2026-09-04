declare class GameObject {
  readonly id: string;
  name: string;
  readonly transform: Transform;
  active: boolean;
  readonly children: GameObject[];
  getComponent(type: unknown): unknown;
  getComponents(type: unknown): unknown[];
}

declare class TextRenderer {
  readonly gameObject: GameObject;
  text: string;
  fontSize: number;
  alignment: 'left' | 'center' | 'right';
  sortingOrder: number;
  offsetY: number;
}

declare class Transform {
  localPosition: Vector2;
  localRotation: number;
  localScale: Vector2;
  get position(): Vector2;
  set position(value: Vector2);
}

declare class Vector2 {
  x: number;
  y: number;
  constructor(x?: number, y?: number);
  set(x: number, y: number): this;
}

declare class BoxCollider2D {
  readonly gameObject: GameObject;
  width: number;
  height: number;
  offset: Vector2;
  isTrigger: boolean;
}

declare class Rigidbody2D {
  readonly gameObject: GameObject;
  velocity: Vector2;
  gravityScale: number;
  isKinematic: boolean;
}

declare class AudioSource {
  readonly gameObject: GameObject;
  volume: number;
  loop: boolean;
  playOnAwake: boolean;
  play(): void;
  playOneShot(): void;
  stop(): void;
}

declare class Collision2D {
  readonly gameObject: GameObject;
  readonly collider: BoxCollider2D;
}

declare class Behaviour {
  gameObject: GameObject;
  transform: Transform;
  bind(gameObject: GameObject): void;
  getRigidbody2D(): Rigidbody2D | null;
  getBoxCollider2D(): BoxCollider2D | null;
  getAudioSource(): AudioSource | null;
  findGameObject(name: string): GameObject | null;
  onAwake(): void;
  onStart(): void;
  onUpdate(deltaTime: number): void;
  onFixedUpdate(fixedDeltaTime: number): void;
  onDestroy(): void;
  onCollisionEnter(collision: Collision2D): void;
  onCollisionExit(collision: Collision2D): void;
  onTriggerEnter(collision: Collision2D): void;
  onTriggerExit(collision: Collision2D): void;
}

declare class Input {
  static getKey(key: string): boolean;
  static getAxis(axis: 'Horizontal' | 'Vertical'): number;
}

declare class Time {
  static deltaTime: number;
  static fixedDeltaTime: number;
}

declare class Debug {
  static log(...args: unknown[]): void;
  static warn(...args: unknown[]): void;
  static error(...args: unknown[]): void;
}

declare module '@js-game-engine/script-api' {
  export {
    Behaviour,
    GameObject,
    Transform,
    Vector2,
    BoxCollider2D,
    Rigidbody2D,
    AudioSource,
    TextRenderer,
    Collision2D,
    Input,
    Time,
    Debug,
  };
}

declare module 'engine' {
  export {
    Behaviour,
    GameObject,
    Transform,
    Vector2,
    BoxCollider2D,
    Rigidbody2D,
    AudioSource,
    TextRenderer,
    Collision2D,
    Input,
    Time,
    Debug,
  };
}
