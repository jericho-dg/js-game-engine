import * as esbuild from 'esbuild-wasm';
import wasmURL from 'esbuild-wasm/esbuild.wasm?url';
import {
  Behaviour,
  BoxCollider2D,
  Collision2D,
  Debug,
  Input,
  Rigidbody2D,
  SceneManager,
  AudioSource,
  TextRenderer,
  Time,
  Vector2,
} from '@js-game-engine/engine';
import type { ScriptRecord } from '@js-game-engine/shared';

let esbuildReady: Promise<void> | null = null;
let buildQueue: Promise<unknown> = Promise.resolve();
const compileCache = new Map<string, new () => Behaviour>();
/** Bump when ENGINE_SHIM changes so cached script classes are invalidated. */
const COMPILE_VERSION = 5;

export function initScriptCompiler(): Promise<void> {
  if (!esbuildReady) {
    esbuildReady = esbuild.initialize({ wasmURL }).catch((error) => {
      esbuildReady = null;
      throw error;
    });
  }
  return esbuildReady;
}

const ENGINE_SHIM = `
export class Vector2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  set(x, y) { this.x = x; this.y = y; return this; }
}
export class Behaviour {
  gameObject = null;
  transform = null;
  bind(gameObject) {
    this.gameObject = gameObject;
    this.transform = gameObject.transform;
  }
  findGameObject(name) {
    const scene = this.gameObject?.scene;
    return scene ? scene.findByName(name) : null;
  }
  loadScene(nameOrId) {
    globalThis.__JGE__.SceneManager.loadScene(nameOrId);
  }
  getRigidbody2D() {
    if (!this.gameObject) return null;
    return this.gameObject.getComponent(globalThis.__JGE__.Rigidbody2D);
  }
  getBoxCollider2D() {
    if (!this.gameObject) return null;
    return this.gameObject.getComponent(globalThis.__JGE__.BoxCollider2D);
  }
  getAudioSource() {
    if (!this.gameObject) return null;
    return this.gameObject.getComponent(globalThis.__JGE__.AudioSource);
  }
  onAwake() {}
  onStart() {}
  onUpdate(_dt) {}
  onFixedUpdate(_dt) {}
  onDestroy() {}
  onCollisionEnter(_collision) {}
  onCollisionExit(_collision) {}
  onTriggerEnter(_collision) {}
  onTriggerExit(_collision) {}
}
export class Collision2D {
  constructor(gameObject, collider) {
    this.gameObject = gameObject;
    this.collider = collider;
  }
}
export const BoxCollider2D = globalThis.__JGE__.BoxCollider2D;
export const Rigidbody2D = globalThis.__JGE__.Rigidbody2D;
export const AudioSource = globalThis.__JGE__.AudioSource;
export const TextRenderer = globalThis.__JGE__.TextRenderer;
export const SceneManager = globalThis.__JGE__.SceneManager;
export const Input = globalThis.__JGE__.Input;
export const Time = globalThis.__JGE__.Time;
export const Debug = globalThis.__JGE__.Debug;
`;

function enqueueBuild<T>(task: () => Promise<T>): Promise<T> {
  const result = buildQueue.then(task, task);
  buildQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

/** Unblock the compile queue after a hung esbuild build times out. */
export function resetBuildQueue(): void {
  buildQueue = Promise.resolve();
}

export async function compileScript(source: string): Promise<string> {
  return enqueueBuild(async () => {
    await initScriptCompiler();

    const wrappedSource = `
import { Behaviour, Vector2, Input, Time, Debug, AudioSource, TextRenderer, Rigidbody2D } from 'engine-shim';
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
      format: 'cjs',
      target: 'es2022',
    });

    const output = result.outputFiles[0]?.text;
    if (!output) throw new Error('Script compilation produced no output.');
    return output;
  });
}

export function instantiateScript(
  compiledJs: string,
): new () => Behaviour {
  installEngineGlobals();

  const module = { exports: {} as { default?: new () => Behaviour } };
  const run = new Function('module', 'exports', compiledJs) as (
    module: { exports: { default?: new () => Behaviour } },
    exports: { default?: new () => Behaviour },
  ) => void;
  run(module, module.exports);

  const ScriptClass = module.exports.default;
  if (typeof ScriptClass !== 'function') {
    throw new Error('Script must export a default class extending Behaviour.');
  }
  return ScriptClass;
}

export async function compileScriptRecord(
  script: ScriptRecord,
): Promise<new () => Behaviour> {
  const cacheKey = `${COMPILE_VERSION}\0${script.id}\0${script.source}`;
  const cached = compileCache.get(cacheKey);
  if (cached) return cached;

  const compiled = await compileScript(script.source);
  const ScriptClass = instantiateScript(compiled);
  compileCache.set(cacheKey, ScriptClass);
  return ScriptClass;
}

function installEngineGlobals(): void {
  (globalThis as typeof globalThis & { __JGE__?: object }).__JGE__ = {
    Input,
    Time,
    Debug,
    Vector2,
    Behaviour,
    Rigidbody2D,
    BoxCollider2D,
    Collision2D,
    SceneManager,
    AudioSource,
    TextRenderer,
  };
}

export { Behaviour, Vector2, Input, Time, Debug };
