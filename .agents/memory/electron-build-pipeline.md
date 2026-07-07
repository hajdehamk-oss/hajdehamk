---
name: Electron build pipeline
description: How to build and package the Hajde Ha POS Electron app; critical file naming rules
---

## Build commands
- `npm run electron:dev` — dev mode: starts local SQLite server on port 5000 (needs `hajdeha-config.json` in cwd)
- `npm run electron:build:server` — compiles Electron files via `script/build-local.ts`
- `npm run electron:build` — full build: frontend + server + electron-builder packaging

## Output files (must stay consistent)
| Source | Built output | Referenced by |
|--------|-------------|---------------|
| `server/index-local.ts` | `dist/index-local.mjs` (ESM) | `electron/main.ts` + `package.json extraResources` |
| `electron/main.ts` | `electron/main.cjs` (CJS) | `package.json "main"` field |
| `electron/preload.ts` | `electron/preload.js` (CJS named .js) | `electron/main.ts` preload path |

**Why:** ESM format needed for local server because of dynamic imports + top-level async. CJS needed for Electron main (electron-builder compatibility). Preload uses `.js` extension because that's what `path.join(__dirname, "preload.js")` in main.ts resolves to.

## Gotchas
- `better-sqlite3` needs native compilation — install with `--ignore-scripts` on Replit; electron-builder handles proper rebuild via `electron-rebuild` for the target platform
- `import.meta.url` must not be used in files compiled to CJS — use a banner to inject `__filename`/`__dirname` or restructure
- Top-level `await` is unsupported in CJS — all `index-local.ts` top-level code must be wrapped in a `main()` async function

## electron-builder config
Lives in `package.json` under `"build"` key. AppId: `com.hajdeha.pos`. Targets: Win NSIS x64, Mac DMG x64+arm64, Linux AppImage.
