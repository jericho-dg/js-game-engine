# js-game-engine

A browser-native 2D game engine with a Unity-inspired editor. Built with React, Canvas 2D, TypeScript, and Monaco.

## Status

**Phase 9 — Hosting & Publishing** complete. Supabase backend, production auth, sync conflicts, publish, sharing, and public game gallery.

**Phase 8 — Cloud Sync** complete. Projects sync automatically to cloud storage on create, save, import, and delete.

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

## Phase 9 features

### Hosted cloud backend (Supabase)
- The cloud API supports a **Supabase** storage backend for production hosting
- Postgres stores users, sessions, project metadata, shares, and published-game records
- Supabase Storage holds project `.jge.zip` archives and published game files
- Local dev still uses the default **file** backend (`.cloud-data/`) with no Supabase account required

**Supabase setup**

1. Create a [Supabase](https://supabase.com) project
2. Run the migration in [`packages/cloud-api/supabase/migrations/001_cloud_backend.sql`](packages/cloud-api/supabase/migrations/001_cloud_backend.sql) (SQL editor or Supabase CLI)
3. Copy [`packages/cloud-api/.env.example`](packages/cloud-api/.env.example) to `packages/cloud-api/.env` and set:
   - `CLOUD_STORE=supabase`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-side only — never expose in the editor)
4. Start the API: `npm run dev:cloud-api`

### Production auth (Supabase Auth)
- When `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in the editor, sign-up and sign-in use **Supabase Auth** (email + password)
- Display name is stored in user metadata and a `profiles` table
- The cloud API validates Supabase JWT access tokens when `CLOUD_STORE=supabase`
- Local dev without Supabase env vars keeps the legacy display-name login via the file backend

**Production auth setup**

1. Run migration [`002_supabase_auth.sql`](packages/cloud-api/supabase/migrations/002_supabase_auth.sql) after migration 001
2. In Supabase **Authentication → Providers**, enable Email (disable “Confirm email” for faster dev testing if you prefer)
3. Set editor env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (Project Settings → API → anon public key)
4. Keep cloud API on `CLOUD_STORE=supabase` with the service role key

### Public game gallery
- Browse published games from the **Game Gallery** tab on the project manager (when the remote cloud API is enabled)
- `GET /v1/gallery` lists games marked public, newest first
- When publishing, check **List in the public game gallery** to include your game
- Anyone can play gallery games via the **Play** link (same `/play/{id}/` URLs as direct publish links)

### Sync conflict resolution
- When a linked project changed on this device **and** in the cloud since the last sync, a dialog lets you choose:
  - **Keep this device** — upload local to cloud
  - **Keep cloud** — replace local with cloud
  - **Keep both as copies** — local stays here; cloud version imported as a new project
  - **Decide later** — skip for now; project shows a sync conflict badge

### One-click publish
- When signed in with the remote cloud API, **Publish** uploads a standalone HTML5 build and returns a shareable play URL
- Optionally **list in the public game gallery** from the publish dialog
- Republishing the same project updates the same URL
- Play URLs are served by the **cloud API** at `/play/{id}/` (Vite proxies `/play` in local dev)
- In production (Vercel editor + Railway API), play links use your **Railway host** by default — the editor static app does not serve `/play` itself
- Optional: use **Vercel** play links by adding a rewrite ` /play/:path*` → `https://<cloud-api>.up.railway.app/play/:path*` and set Railway `PLAY_URL_ORIGIN=https://<your-vercel-app>`

### Project sharing
- **Share** on a project card creates a link recipients can use to import a copy
- Share links look like `/?share={token}` and require the remote cloud API
- Imported copies are independent — changes are not synced back to the original

## Phase 8 features

### Cloud sync
- Projects sync to cloud automatically on create, save, import, and delete
- Opening the project manager merges local and cloud copies using `updatedAt` conflict resolution
- **Sync status** in the project manager and editor toolbar shows last sync time and pending/failed state with **Retry**
- Failed syncs are queued locally; local saves always succeed even when cloud is unreachable

### Remote cloud API (optional)
  1. Copy `packages/editor/.env.example` to `packages/editor/.env` and set `VITE_CLOUD_API_URL=/cloud-api`
  2. Run `npm run dev:cloud-api` in one terminal and `npm run dev` in another
  3. Sign up or sign in from the project manager header
  4. Delete dialog offers **Remove from this device** vs **Delete everywhere** when signed in

  For hosted Supabase storage, configure `packages/cloud-api/.env` (see Phase 9 above) before starting the API.

### Deploying (Vercel + Railway)
- **Railway:** run `npm run start -w @js-game-engine/cloud-api` with `CLOUD_STORE=supabase` and Supabase server env vars
- **Vercel:** deploy from repo root (uses root `vercel.json`) **or** set **Root Directory** to `packages/editor` (uses `packages/editor/vercel.json`); build runs `npm run build` (player bundle + editor) so publish can load `jge-player.js`; output is always `packages/editor/dist`
- In Vercel project settings, turn **off** overrides for Output Directory (or set `dist` only when Root Directory is `packages/editor`) so `vercel.json` is not fighting the dashboard
- Set **`VITE_CLOUD_API_URL`** to your Railway public URL **including `https://`**, e.g. `https://your-app.up.railway.app` (not a path on the Vercel domain)
- Redeploy Vercel after changing any `VITE_*` variable
- **Published games:** open the play URL from the publish dialog (Railway `/play/...` unless you configured the Vercel rewrite above). Old links on the Vercel domain without a rewrite will 404

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
