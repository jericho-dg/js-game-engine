import {
  ScriptComponent,
  type Scene,
  type Behaviour,
} from '@js-game-engine/engine';
import type { ScriptRecord } from '@js-game-engine/shared';
import { getPlayReadyScriptClass } from './scriptCompileRegistry';

export interface ScriptAttachResult {
  errors: Array<{ objectName: string; scriptName: string; message: string }>;
}

export function attachScriptsToScene(
  scene: Scene,
  scripts: ScriptRecord[],
): ScriptAttachResult {
  const scriptMap = new Map(scripts.map((script) => [script.id, script]));
  const errors: ScriptAttachResult['errors'] = [];

  for (const root of scene.rootObjects) {
    attachScriptsRecursive(root, scriptMap, errors);
  }

  return { errors };
}

function attachScriptsRecursive(
  obj: import('@js-game-engine/engine').GameObject,
  scriptMap: Map<string, ScriptRecord>,
  errors: ScriptAttachResult['errors'],
): void {
  for (const component of obj.getComponents(ScriptComponent)) {
    if (!component.scriptAssetId) continue;

    const script = scriptMap.get(component.scriptAssetId);
    if (!script) {
      errors.push({
        objectName: obj.name,
        scriptName: component.scriptAssetId,
        message: 'Script asset not found.',
      });
      continue;
    }

    const ScriptClass = getPlayReadyScriptClass(script.id, script.source);
    if (!ScriptClass) {
      errors.push({
        objectName: obj.name,
        scriptName: script.name,
        message: 'Script is not compiled. Save the script first.',
      });
      continue;
    }

    try {
      const instance: Behaviour = new ScriptClass();
      component.setBehaviour(instance, script.name);
    } catch (error) {
      errors.push({
        objectName: obj.name,
        scriptName: script.name,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const child of obj.children) {
    attachScriptsRecursive(child, scriptMap, errors);
  }
}

export function detachScriptsFromScene(scene: Scene): void {
  for (const root of scene.rootObjects) {
    detachScriptsRecursive(root);
  }
}

function detachScriptsRecursive(obj: import('@js-game-engine/engine').GameObject): void {
  for (const component of obj.getComponents(ScriptComponent)) {
    component.clearBehaviour();
  }
  for (const child of obj.children) {
    detachScriptsRecursive(child);
  }
}
