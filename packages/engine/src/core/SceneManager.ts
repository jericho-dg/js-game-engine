import { Debug } from '../input/Input';
import type { SerializedScene } from '@js-game-engine/shared';

export type SceneLoader = (data: SerializedScene) => void;

/** Runtime scene switching (play mode / standalone player). */
export class SceneManager {
  private static catalog = new Map<string, SerializedScene>();
  private static loader: SceneLoader | null = null;

  static configure(
    scenes: Array<{ id: string; name: string; data: SerializedScene }>,
    loader: SceneLoader,
  ): void {
    SceneManager.catalog.clear();
    for (const scene of scenes) {
      SceneManager.catalog.set(scene.id, scene.data);
      SceneManager.catalog.set(scene.name, scene.data);
    }
    SceneManager.loader = loader;
  }

  static loadScene(nameOrId: string): void {
    const data = SceneManager.catalog.get(nameOrId);
    if (!data) {
      Debug.warn(`Scene not found: ${nameOrId}`);
      return;
    }
    SceneManager.loader?.(data);
  }

  static reset(): void {
    SceneManager.catalog.clear();
    SceneManager.loader = null;
  }
}
