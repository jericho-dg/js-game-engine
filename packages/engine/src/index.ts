import { ENGINE_VERSION } from '@js-game-engine/shared';

export { ENGINE_VERSION };

/** Placeholder — game loop and scene graph arrive in Phase 1. */
export function createEngine() {
  return { version: ENGINE_VERSION };
}
