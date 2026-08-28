import * as esbuild from 'esbuild-wasm';
import wasmURL from 'esbuild-wasm/esbuild.wasm?url';
import {
  Behaviour,
  Debug,
  Input,
  Time,
  Vector2,
} from '@js-game-engine/engine';
import type { ScriptRecord } from '@js-game-engine/shared';

let esbuildReady: Promise<void> | null = null;

export function initScriptCompiler(): Promise<void> {
  if (!esbuildReady) {
    esbuildReady = esbuild.initialize({ wasmURL });
  }
  return esbuildReady;
}

const ENGINE_SHIM = `
export class Vector2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  set(x, y) { this.x = x; this.y = y; return this; }
}
export class Behaviour {
  onAwake() {}
  onStart() {}
  onUpdate(_dt) {}
  onFixedUpdate(_dt) {}
  onDestroy() {}
}
export const Input = globalThis.__JGE__.Input;
export const Time = globalThis.__JGE__.Time;
export const Debug = globalThis.__JGE__.Debug;
`;

export async function compileScript(source: string): Promise<string> {
  await initScriptCompiler();

  const wrappedSource = `
import { Behaviour, Vector2, Input, Time, Debug } from 'engine-shim';
${source}
`;

  const result = await esbuild.build({
    stdin: {
      contents: wrappedSource,
      loader: 'ts',
      resolveDir: '/',
    },
    plugins: [
      {
        name: 'engine-shim',
        setup(build) {
          build.onResolve({ filter: /^engine-shim$/ }, () => ({
            path: 'engine-shim',
            namespace: 'engine-shim',
          }));
          build.onLoad({ filter: /.*/, namespace: 'engine-shim' }, () => ({
            contents: ENGINE_SHIM,
            loader: 'js',
          }));
        },
      },
    ],
    write: false,
    bundle: true,
    format: 'esm',
    target: 'es2022',
  });

  const output = result.outputFiles[0]?.text;
  if (!output) throw new Error('Script compilation produced no output.');
  return output;
}

export async function instantiateScript(
  compiledJs: string,
): Promise<new () => Behaviour> {
  installEngineGlobals();

  const blob = new Blob([compiledJs], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);

  try {
    const module = await import(/* @vite-ignore */ url);
    const ScriptClass = module.default;
    if (typeof ScriptClass !== 'function') {
      throw new Error('Script must export a default class extending Behaviour.');
    }
    return ScriptClass;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function compileScriptRecord(
  script: ScriptRecord,
): Promise<new () => Behaviour> {
  const compiled = await compileScript(script.source);
  return instantiateScript(compiled);
}

function installEngineGlobals(): void {
  (globalThis as typeof globalThis & { __JGE__?: object }).__JGE__ = {
    Input,
    Time,
    Debug,
    Vector2,
    Behaviour,
  };
}

export { Behaviour, Vector2, Input, Time, Debug };
