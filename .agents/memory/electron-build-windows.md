---
name: Electron build on Windows
description: Lessons from building the Electron POS app on Windows with Node 26 — covers script runner, Vite alias, and packaging quirks.
---

## Node 26 + TypeScript scripts
- `npx tsx`, `node_modules/.bin/tsx`, `node --import tsx/esm`, and `node --experimental-strip-types` all fail to run `.ts` scripts on Windows with Node 26 due to loader/path bugs.
- **Fix**: Rename build scripts to `.mjs`, remove all TypeScript syntax (`as const`), run with plain `node script/build.mjs`.

## Vite alias + Windows paths
- `path.resolve()` on Windows returns backslash paths; Rollup appends `/module` with a forward slash, creating mixed-separator paths that fail on `vite:load-fallback`.
- **Fix 1**: Normalize alias values with `.replace(/\\/g, "/")`.
- **Fix 2**: For files outside the Vite root (e.g. `shared/`), point aliases directly at the `.ts` file (`@shared/schema` → `shared/schema.ts`) AND add a custom `transform` plugin that runs esbuild on those files — Vite's built-in esbuild transform only covers files inside `root`.
- **Fix 3**: `vite-plugin-pwa` has a Windows path bug in its `buildEnd` hook. Skip it for Electron builds via `ELECTRON_BUILD=true` env flag set before `viteBuild()` is called.

## esbuild `packages: "external"` on esbuild 0.28
- `packages: "external"` in `sharedOpts` causes "entry point cannot be marked as external" on esbuild 0.28.
- **Fix**: Read `package.json` deps and pass them as an explicit `external` array instead.

## Electron packaging fixes (from working build)
- `electron` and `electron-builder` must be in `devDependencies`, not `dependencies`.
- `bufferutil` optional dep must be removed — requires C++ toolchain the restaurant PC may not have.
- `extraResources` block (copying `dist/index-local.mjs` to resources/) is wrong — the server must live inside `app.asar` so `node_modules` resolve correctly. Use `app.asar/dist/index-local.mjs` as the path.
- When spawning the local server from Electron's `execPath` in packaged mode, set `ELECTRON_RUN_AS_NODE=1` — otherwise it launches a second Electron GUI instead of running as Node.
- Set `STATIC_DIST_PATH` env var pointing to `resources/app.asar/dist/public` so the Express server finds assets regardless of launch CWD.
- `app.requestSingleInstanceLock()` is required — without it, reopening the app stacks processes.
- Kill `serverProcess` before `app.relaunch()` in the restart IPC handler — otherwise the old server holds the port.
- esbuild banner manually re-declaring `__filename`/`__dirname` on CJS output causes "already declared" crash — remove it; Node provides them natively in CJS.
- Add `define: { "process.env.NODE_ENV": '"production"' }` + `minifySyntax: true` to the server esbuild call — this strips the dev-only `vite` dynamic import that crashes the packaged app.

**Why**: All of the above were discovered during the actual Windows build+package cycle; none were obvious from the code alone.
