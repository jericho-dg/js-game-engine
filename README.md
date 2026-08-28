# js-game-engine

A browser-native 2D game engine with a Unity-inspired editor. Built with React, Canvas 2D, TypeScript, and Monaco.

## Status

**Phase 4 — Physics and Input** complete. BoxCollider2D, Rigidbody2D, AABB physics, collision/trigger callbacks, and keyboard Input are included.

Previous phases: engine core, editor essentials (IndexedDB, gizmos, asset import), and scripting (Monaco, compile-on-save, play mode).

## Getting started

```bash
npm install
npm run dev
```

Open the URL printed by Vite (typically `http://localhost:5173`).

## Monorepo layout

| Package | Description |
|---------|-------------|
| `packages/editor` | React editor application (Vite + Tailwind) |
| `packages/engine` | Pure TypeScript game runtime (no React) |
| `packages/shared` | Shared types and schema |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the editor dev server |
| `npm run build` | Production build of the editor |
| `npm run typecheck` | Type-check all packages |
| `npm run test` | Run engine unit tests |
