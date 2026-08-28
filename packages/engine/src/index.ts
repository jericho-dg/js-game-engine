import { ENGINE_VERSION } from '@js-game-engine/shared';

export { ENGINE_VERSION };
export { Vector2, Color } from '@js-game-engine/shared';

export { Component } from './core/Component';
export { Transform } from './core/Transform';
export { GameObject } from './core/GameObject';
export { Scene } from './core/Scene';
export { GameLoop, FIXED_DELTA_TIME } from './core/GameLoop';
export { Runtime } from './core/Runtime';

export { Camera2D } from './components/Camera2D';
export { SpriteRenderer } from './components/SpriteRenderer';
export type { SpriteSource } from './components/SpriteRenderer';
export { Rotator } from './components/Rotator';
export { ScriptComponent } from './components/ScriptComponent';
export { BoxCollider2D } from './components/BoxCollider2D';
export { Rigidbody2D } from './components/Rigidbody2D';

export { Behaviour } from './scripting/Behaviour';
export { Collision2D } from './physics/Collision2D';
export { PhysicsWorld } from './physics/PhysicsWorld';
export { Input, Time, Debug } from './input/Input';
export type { LogCallback } from './input/Input';

export { Canvas2DRenderer } from './rendering/Canvas2DRenderer';
export {
  getSceneCamera,
  screenToWorld,
  worldToScreen,
  type CameraState,
} from './rendering/cameraUtils';

export {
  serializeScene,
  deserializeScene,
} from './serialization/sceneSerialization';

export function createEngine() {
  return { version: ENGINE_VERSION };
}
