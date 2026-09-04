# js-game-engine

A browser-native 2D game engine with a Unity-inspired editor. Built with React, Canvas 2D, TypeScript, and Monaco.

## Status

**Phase 8 — Cloud Sync** in progress. Connect a cloud account from the project manager to push, pull, and import projects. The first implementation uses a simulated cloud store in IndexedDB; a real remote API is planned next.

**Phase 7 — Project Management** complete. Multi-scene projects, project manager, Flappy Bird demo, and TextRenderer are included.

**Phase 6 — Export and Polish** complete. Undo/redo, ZIP project export/import, standalone HTML game export, and audio playback are available.

**Phase 5 — Tilemaps and Prefabs** complete. TilemapRenderer with tileset painting, prefab save/instantiate, and project persistence are included.

Previous phases: physics/input, scripting, editor essentials, and engine core.

## Getting started

```bash
npm install
npm run dev
```

Open the URL printed by Vite (typically `http://localhost:5173`). The **Project Manager** opens first — create or open a project to enter the editor.

## Phase 8 features (in progress)

### Cloud sync (simulated)
- **Connect Cloud** in the project manager header (local session; no real auth yet)
- **Push** uploads a local project + assets to a simulated cloud table in IndexedDB
- **Pull** restores the cloud copy over the linked local project
- Sync badges: **Local only**, **Synced**, **Needs push**, **Needs pull**
- **Cloud Library** lists cloud-only projects you can import locally

## Phase 7 features

### Project Manager
- Opens on launch with a list of saved projects (stored in IndexedDB)
- **New Project** — dialog to pick blank, Jump Demo, or Flappy Bird template and name
- **Import** — create a project from a `.jge.zip` archive
- **Open** / **Delete** per project card

### Editor project controls
- **New**, **Open**, and **Projects** buttons in the toolbar top row
- **Projects** saves the current project and returns to the project manager
- **Open** shows a quick-switch dialog without leaving the editor layout

### Scenes
- Each scene is a project asset in the **Scenes** section of the Project panel
- Create, open, and delete scenes; the active scene saves automatically
- Scripts can call `this.loadScene('SceneName')` during play mode

### Flappy Bird demo
- Three-scene template: **Menu**, **Game**, and **GameOver**
- Tap **SPACE** or **↑** to flap; pass pipes to score
- Synthesized flap, score, and crash sound effects

## Phase 6 features

### Undo / Redo
- **Undo** and **Redo** toolbar buttons, or **Ctrl+Z** / **Ctrl+Shift+Z**
- Tracks scene, scripts, prefabs, assets, and selection (debounced during rapid edits)

### Project export / import
- **Export** downloads a `.jge.zip` archive (manifest + assets)
- **Import** replaces the current project from a `.jge.zip` file

### Standalone HTML export
- **Export Game** downloads a self-contained `-game.zip` you can host or open locally
- Contains `index.html`, `jge-player.js`, `game.json`, and an `assets/` folder
- **Text Renderer** components export with the scene and render in the standalone player
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
