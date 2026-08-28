declare class GameObject {
  readonly id: string;
  name: string;
  readonly transform: Transform;
  active: boolean;
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

declare class Behaviour {
  gameObject: GameObject;
  transform: Transform;
  onAwake(): void;
  onStart(): void;
  onUpdate(deltaTime: number): void;
  onFixedUpdate(fixedDeltaTime: number): void;
  onDestroy(): void;
}

declare class Input {
  static getKey(key: string): boolean;
  static getAxis(axis: 'Horizontal' | 'Vertical'): number;
}

declare class Time {
  static deltaTime: number;
}

declare class Debug {
  static log(...args: unknown[]): void;
  static warn(...args: unknown[]): void;
  static error(...args: unknown[]): void;
}

declare module '@js-game-engine/script-api' {
  export { Behaviour, GameObject, Transform, Vector2, Input, Time, Debug };
}

declare module 'engine' {
  export { Behaviour, GameObject, Transform, Vector2, Input, Time, Debug };
}
