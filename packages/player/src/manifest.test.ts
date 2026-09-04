import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { deserializeScene, TextRenderer } from '@js-game-engine/engine';
import type { StandaloneGameManifest } from '@js-game-engine/shared';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('standalone player export', () => {
  it('ships a built jge-player.js bundle', () => {
    const bundlePath = join(root, 'dist/jge-player.js');
    expect(existsSync(bundlePath)).toBe(true);
    const source = readFileSync(bundlePath, 'utf8');
    expect(source).toContain('JGEPlayer');
    expect(source).toContain('bootstrap');
    expect(source).toContain('fillText');
  });

  it('loads the smoke fixture manifest with text', () => {
    const manifestPath = join(root, 'smoke/fixture/game.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as StandaloneGameManifest;
    const scene = deserializeScene(manifest.scene);
    expect(scene.name).toBe('Main');
    expect(scene.rootObjects).toHaveLength(2);

    const player = scene.findByName('Player');
    expect(player).not.toBeNull();

    const label = scene.findByName('Label');
    const text = label?.getComponent(TextRenderer);
    expect(text?.text).toBe('Hello Export');
    expect(text?.fontSize).toBe(32);
  });
});
