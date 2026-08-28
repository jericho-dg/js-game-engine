import { Scene, ScriptComponent, type Behaviour } from '@js-game-engine/engine';
import type { ScriptRecord } from '@js-game-engine/shared';
import { compileScriptRecord } from './ScriptCompiler';
import {
  registerCompiledScript,
  unregisterCompiledScript,
} from './scriptCompileRegistry';

export interface ScriptValidationError {
  objectName: string;
  scriptName: string;
  message: string;
}

/** Compile and smoke-test a script. Returns an error message, or null if valid. */
export async function validateAndCompileScript(
  script: ScriptRecord,
): Promise<string | null> {
  try {
    const ScriptClass = await compileScriptRecord(script);
    smokeTestScriptClass(ScriptClass);
    registerCompiledScript(script.id, script.source, ScriptClass);
    return null;
  } catch (error) {
    unregisterCompiledScript(script.id);
    return error instanceof Error ? error.message : String(error);
  }
}

export function collectSceneScriptIds(scene: Scene): string[] {
  const ids = new Set<string>();
  for (const root of scene.rootObjects) {
    collectObjectScriptIds(root, ids);
  }
  return [...ids];
}

function collectObjectScriptIds(
  obj: import('@js-game-engine/engine').GameObject,
  ids: Set<string>,
): void {
  for (const component of obj.getComponents(ScriptComponent)) {
    if (component.scriptAssetId) ids.add(component.scriptAssetId);
  }
  for (const child of obj.children) {
    collectObjectScriptIds(child, ids);
  }
}

export function getPlayBlockers(
  scene: Scene,
  scripts: ScriptRecord[],
  options: {
    hasUnsavedScripts: boolean;
    scriptErrors: Record<string, string | null>;
    isScriptPlayReady: (script: ScriptRecord) => boolean;
  },
): string[] {
  const blockers: string[] = [];
  const scriptMap = new Map(scripts.map((script) => [script.id, script]));

  if (options.hasUnsavedScripts) {
    blockers.push('Save all scripts before entering play mode.');
  }

  for (const scriptId of collectSceneScriptIds(scene)) {
    const script = scriptMap.get(scriptId);
    if (!script) {
      blockers.push(`Missing script asset: ${scriptId}`);
      continue;
    }

    const compileError = options.scriptErrors[scriptId];
    if (compileError) {
      blockers.push(`${script.name}: ${compileError}`);
      continue;
    }

    if (!options.isScriptPlayReady(script)) {
      blockers.push(`${script.name} must be compiled. Save the script first.`);
    }
  }

  return blockers;
}

function smokeTestScriptClass(ScriptClass: new () => Behaviour): void {
  const mockScene = new Scene('__validation__');
  const mockObject = mockScene.createGameObject('__validation__');

  let instance: Behaviour;
  try {
    instance = new ScriptClass();
  } catch (error) {
    throw formatSmokeError('instantiate', error);
  }

  bindToMockObject(instance, mockObject);

  try {
    instance.onAwake();
    instance.onStart();
    instance.onUpdate(1 / 60);
    instance.onFixedUpdate(1 / 60);
    instance.onDestroy();
  } catch (error) {
    throw formatSmokeError('runtime', error);
  }
}

function bindToMockObject(
  instance: Behaviour,
  mockObject: import('@js-game-engine/engine').GameObject,
): void {
  if (typeof instance.bind === 'function') {
    instance.bind(mockObject);
    return;
  }
  instance.gameObject = mockObject;
  instance.transform = mockObject.transform;
}

function formatSmokeError(phase: string, error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(`${phase}: ${message}`);
}
