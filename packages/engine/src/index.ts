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
