import type { Behaviour } from '@js-game-engine/engine';

interface CompiledEntry {
  source: string;
  ScriptClass: new () => Behaviour;
}

const playReadyScripts = new Map<string, CompiledEntry>();

export function registerCompiledScript(
  scriptId: string,
  source: string,
  ScriptClass: new () => Behaviour,
): void {
  playReadyScripts.set(scriptId, { source, ScriptClass });
}

export function unregisterCompiledScript(scriptId: string): void {
  playReadyScripts.delete(scriptId);
}

export function getPlayReadyScriptClass(
  scriptId: string,
  source: string,
): (new () => Behaviour) | null {
  const entry = playReadyScripts.get(scriptId);
  if (!entry || entry.source !== source) return null;
  return entry.ScriptClass;
}

export function clearCompiledScripts(): void {
  playReadyScripts.clear();
}
