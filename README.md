# js-game-engine

A browser-native 2D game engine with a Unity-inspired editor. Built with React, Canvas 2D, TypeScript, and Monaco.

## Status

**Phase 6 — Export and Polish** in progress. Undo/redo, ZIP project export/import, and standalone HTML game export are available.

**Phase 5 — Tilemaps and Prefabs** complete. TilemapRenderer with tileset painting, prefab save/instantiate, and project persistence are included.

Previous phases: physics/input, scripting, editor essentials, and engine core.

## Getting started

```bash
npm install
npm run dev
```

Open the URL printed by Vite (typically `http://localhost:5173`).

## Phase 6 features (in progress)

### Undo / Redo
- **Undo** and **Redo** toolbar buttons, or **Ctrl+Z** / **Ctrl+Shift+Z**
- Tracks scene, scripts, prefabs, assets, and selection (debounced during rapid edits)

### Project export / import
- **Export** downloads a `.jge.zip` archive (manifest + assets)
- **Import** replaces the current project from a `.jge.zip` file

### Standalone HTML export
- **Export Game** downloads a self-contained `-game.zip` you can host or open locally
- Contains `index.html`, `jge-player.js`, `game.json`, and an `assets/` folder
- Click **Click to Play** to start (unlocks audio via user gesture)
- Build the player bundle first if exporting from a fresh clone: `npm run build:player`

### Audio
- Add an **Audio Source** component and assign imported audio clips (MP3, WAV, OGG)
- **Play On Awake**, **Loop**, and **Volume** controls in the Inspector
- Audio plays during Play mode via the Web Audio API
- The default **Jump Demo** includes a synthesized jump sound triggered from `PlayerMove.ts` via `getAudioSource().playOneShot()`

## Phase 5 features

### Tilemaps
- Add a **Tilemap** object from the Hierarchy or Inspector
- Assign a PNG tileset in the Inspector (uniform grid; default 32×32 tiles)
- Set **Paint Tile Index** and click/drag in the Scene view to paint; right-click to erase
- Tilemaps render behind sprites by default (`sortingOrder: -10`)

### Prefabs
- Select a GameObject and click **Save Prefab** in the Project panel
- Double-click a prefab to instantiate it in the scene (new IDs are generated for the whole subtree)
- Prefabs are stored in the project file alongside the scene and scripts

## Monorepo layout

| Package | Description |
|---------|-------------|
| `packages/editor` | React editor application (Vite + Tailwind) |
| `packages/engine` | Pure TypeScript game runtime (no React) |
| `packages/player` | Standalone HTML5 player bundle (`jge-player.js`) |
| `packages/shared` | Shared types and schema |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the editor dev server |
| `npm run build:player` | Build the standalone player bundle |
| `npm run build` | Build player + editor for production |
| `npm run typecheck` | Type-check all packages |
| `npm run test` | Run engine unit tests |
