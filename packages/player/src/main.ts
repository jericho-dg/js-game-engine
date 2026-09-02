import type { StandaloneGameManifest } from '@js-game-engine/shared';
import {
  AudioSource,
  Behaviour,
  BoxCollider2D,
  Collision2D,
  Debug,
  Input,
  Rigidbody2D,
  Runtime,
  Scene,
  ScriptComponent,
  SpriteRenderer,
  TilemapRenderer,
  AudioSystem,
  Time,
  deserializeScene,
  type GameObject,
} from '@js-game-engine/engine';

interface LoadedAssets {
  images: Map<string, HTMLImageElement>;
  audioBuffers: Map<string, AudioBuffer>;
}

function installEngineGlobals(): void {
  (globalThis as typeof globalThis & { __JGE__?: object }).__JGE__ = {
    Input,
    Time,
    Debug,
    Behaviour,
    Rigidbody2D,
    BoxCollider2D,
    Collision2D,
    AudioSource,
  };
}

function instantiateCompiledScript(compiledJs: string): new () => Behaviour {
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

function attachCompiledScripts(
  scene: Scene,
  scripts: StandaloneGameManifest['scripts'],
): string[] {
  const scriptMap = new Map(scripts.map((script) => [script.id, script]));
  const errors: string[] = [];

  const attachRecursive = (obj: GameObject) => {
    for (const component of obj.getComponents(ScriptComponent)) {
      if (!component.scriptAssetId) continue;
      const script = scriptMap.get(component.scriptAssetId);
      if (!script) {
        errors.push(`${obj.name}: missing script ${component.scriptAssetId}`);
        continue;
      }
      try {
        const ScriptClass = instantiateCompiledScript(script.compiled);
        const instance = new ScriptClass();
        component.setBehaviour(instance, script.name);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${obj.name} / ${script.name}: ${message}`);
      }
    }
    for (const child of obj.children) {
      attachRecursive(child);
    }
  };

  for (const root of scene.rootObjects) {
    attachRecursive(root);
  }

  return errors;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    image.src = url;
  });
}

async function loadAssets(manifest: StandaloneGameManifest): Promise<LoadedAssets> {
  const images = new Map<string, HTMLImageElement>();
  const audioBuffers = new Map<string, AudioBuffer>();

  for (const asset of manifest.assets) {
    const response = await fetch(asset.file);
    if (!response.ok) {
      throw new Error(`Failed to load asset: ${asset.file}`);
    }
    const blob = await response.blob();
    if (asset.type === 'audio') {
      const buffer = await AudioSystem.decodeBlob(blob);
      audioBuffers.set(asset.id, buffer);
    } else {
      const url = URL.createObjectURL(blob);
      try {
        const image = await loadImage(url);
        images.set(asset.id, image);
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  }

  return { images, audioBuffers };
}

function hydrateScene(scene: Scene, assets: LoadedAssets): void {
  const hydrateObject = (obj: GameObject) => {
    for (const sprite of obj.getComponents(SpriteRenderer)) {
      if (!sprite.spriteAssetId) continue;
      const image = assets.images.get(sprite.spriteAssetId);
      if (image) {
        sprite.image = image;
        if (sprite.width === 64 && sprite.height === 64) {
          sprite.width = image.naturalWidth;
          sprite.height = image.naturalHeight;
        }
      }
    }

    for (const tilemap of obj.getComponents(TilemapRenderer)) {
      if (!tilemap.tilesetAssetId) continue;
      const image = assets.images.get(tilemap.tilesetAssetId);
      if (image) {
        tilemap.image = image;
      }
      tilemap.ensureTileBuffer();
    }

    for (const audio of obj.getComponents(AudioSource)) {
      if (!audio.audioAssetId) continue;
      const clip = assets.audioBuffers.get(audio.audioAssetId);
      if (clip) {
        audio.clip = clip;
      }
    }

    for (const child of obj.children) {
      hydrateObject(child);
    }
  };

  for (const root of scene.rootObjects) {
    hydrateObject(root);
  }
}

function wireInput(): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    Input._setKey(event.key, true);
  };
  const onKeyUp = (event: KeyboardEvent) => {
    Input._setKey(event.key, false);
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };
}

async function startGame(
  canvas: HTMLCanvasElement,
  overlay: HTMLElement | null,
): Promise<void> {
  const response = await fetch('game.json');
  if (!response.ok) {
    throw new Error('Failed to load game.json');
  }

  const manifest = (await response.json()) as StandaloneGameManifest;
  const assets = await loadAssets(manifest);
  const scene = deserializeScene(manifest.scene);
  hydrateScene(scene, assets);

  const scriptErrors = attachCompiledScripts(scene, manifest.scripts);
  if (scriptErrors.length > 0) {
    throw new Error(scriptErrors.join('\n'));
  }

  await AudioSystem.ensureContext();
  overlay?.classList.add('hidden');

  const container = canvas.parentElement ?? document.body;
  const runtime = new Runtime({ scene, canvas, showGrid: false });
  const unwireInput = wireInput();

  const resize = () => {
    const { width, height } = container.getBoundingClientRect();
    runtime.resize(width, height);
  };

  resize();
  window.addEventListener('resize', resize);
  runtime.start();

  window.addEventListener('beforeunload', () => {
    runtime.stop();
    unwireInput();
    window.removeEventListener('resize', resize);
  });
}

export function bootstrap(
  canvas: HTMLCanvasElement,
  overlay: HTMLElement | null,
): void {
  const launch = () => {
    overlay?.removeEventListener('click', launch);
    void startGame(canvas, overlay).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      if (overlay) {
        overlay.classList.remove('hidden');
        overlay.textContent = `Failed to start: ${message}`;
      } else {
        alert(message);
      }
    });
  };

  if (overlay) {
    overlay.addEventListener('click', launch);
  } else {
    launch();
  }
}

declare global {
  interface Window {
    JGEPlayer: {
      bootstrap: typeof bootstrap;
    };
  }
}

window.JGEPlayer = { bootstrap };
