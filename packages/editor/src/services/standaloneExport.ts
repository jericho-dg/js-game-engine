import {
  STANDALONE_EXPORT_VERSION,
  type StandaloneGameManifest,
} from '@js-game-engine/shared';
import type { Scene } from '@js-game-engine/engine';
import { serializeScene } from '@js-game-engine/engine';
import JSZip from 'jszip';
import { db } from './db';
import { compileScript } from '../scripting/ScriptCompiler';
import { collectProjectSceneScriptIds, getPlayBlockers } from '../scripting/validateScripts';
import { useScriptStore } from '../stores/scriptStore';
import { useSceneAssetStore } from '../stores/sceneAssetStore';
import {
  extensionForMime,
  downloadBlob,
} from './projectExport';

export const STANDALONE_EXPORT_EXTENSION = '-game.zip';

function createIndexHtml(projectName: string): string {
  const title = escapeHtml(projectName);
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      html, body {
        margin: 0;
        height: 100%;
        background: #1a1a2e;
        color: #cccccc;
        font-family: system-ui, sans-serif;
      }
      body {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #wrap {
        position: relative;
        width: min(960px, 100vw);
        height: min(600px, 100vh);
      }
      canvas {
        width: 100%;
        height: 100%;
        display: block;
        background: #1a1a2e;
      }
      #overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.55);
        cursor: pointer;
        user-select: none;
        text-align: center;
        padding: 1rem;
      }
      #overlay.hidden {
        display: none;
      }
    </style>
  </head>
  <body>
    <div id="wrap">
      <canvas id="game"></canvas>
      <div id="overlay">Click to Play</div>
    </div>
    <script src="jge-player.js"></script>
    <script>
      JGEPlayer.bootstrap(
        document.getElementById('game'),
        document.getElementById('overlay'),
      );
    </script>
  </body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function loadPlayerBundle(): Promise<string> {
  const response = await fetch(`${import.meta.env.BASE_URL}jge-player.js`);
  if (!response.ok) {
    throw new Error(
      'Player runtime is missing. Run "npm run build:player" from the repo root, then try again.',
    );
  }
  const source = await response.text();
  if (!source.includes('fillText')) {
    throw new Error(
      'Player runtime is outdated (missing text rendering). Run "npm run build:player", then try again.',
    );
  }
  return source;
}

export async function exportStandaloneGame(
  scene: Scene,
  projectId: string,
  projectName: string,
): Promise<void> {
  const scripts = useScriptStore.getState().scripts;
  const blockers = getPlayBlockers(scene, scripts, {
    hasUnsavedScripts: useScriptStore.getState().hasUnsavedScripts(),
    scriptErrors: useScriptStore.getState().scriptErrors,
    isScriptPlayReady: (script) => useScriptStore.getState().isScriptPlayReady(script),
  });

  if (blockers.length > 0) {
    throw new Error(blockers.join('\n'));
  }

  const sceneAssetStore = useSceneAssetStore.getState();
  sceneAssetStore.updateActiveSceneData(serializeScene(scene));
  const scenes = sceneAssetStore.scenes;
  const activeSceneId = sceneAssetStore.activeSceneId ?? undefined;

  const scriptIds = collectProjectSceneScriptIds(scenes);
  const compiledScripts: StandaloneGameManifest['scripts'] = [];

  for (const scriptId of scriptIds) {
    const script = scripts.find((entry) => entry.id === scriptId);
    if (!script) {
      throw new Error(`Missing script asset: ${scriptId}`);
    }
    const compiled = await compileScript(script.source);
    compiledScripts.push({
      id: script.id,
      name: script.name,
      compiled,
    });
  }

  const storedAssets = await db.assets.where('projectId').equals(projectId).toArray();
  const assets: StandaloneGameManifest['assets'] = storedAssets.map((entry) => ({
    id: entry.id,
    name: entry.name,
    type: entry.type,
    mimeType: entry.mimeType,
    width: entry.width,
    height: entry.height,
    file: `assets/${entry.id}${extensionForMime(entry.mimeType)}`,
  }));

  const manifest: StandaloneGameManifest = {
    exportVersion: STANDALONE_EXPORT_VERSION,
    name: projectName,
    scene: serializeScene(scene),
    activeSceneId,
    scenes,
    scripts: compiledScripts,
    assets,
  };

  const playerBundle = await loadPlayerBundle();
  const zip = new JSZip();
  zip.file('index.html', createIndexHtml(projectName));
  zip.file('jge-player.js', playerBundle);
  zip.file('game.json', JSON.stringify(manifest, null, 2));

  for (const entry of storedAssets) {
    const path = `assets/${entry.id}${extensionForMime(entry.mimeType)}`;
    zip.file(path, entry.blob);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const safeName = projectName.replace(/[^\w.-]+/g, '_') || 'game';
  downloadBlob(blob, `${safeName}${STANDALONE_EXPORT_EXTENSION}`);
}
