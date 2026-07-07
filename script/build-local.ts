/**
 * Builds the Electron-specific files (local server + main process + preload).
 * Run: npm run electron:build:server
 */
import { build } from "esbuild";

const sharedOpts = {
  bundle: true,
  packages: "external" as const, // keep all node_modules external
  platform: "node" as const,
  format: "cjs" as const,
  logLevel: "info" as const,
};

// 1. Local server (Express + SQLite)
await build({
  ...sharedOpts,
  entryPoints: ["server/index-local.ts"],
  outfile: "dist/index-local.cjs",
  // Don't pull in vite (only used in dev mode, loaded dynamically)
  external: ["vite", "vite-plugin-pwa", "@vitejs/*", "@replit/*"],
  banner: {
    js: `
// ESM shim for CJS bundle
import { createRequire } from 'module';
import { fileURLToPath as _ftu } from 'url';
import { dirname as _dn } from 'path';
const require = createRequire(import.meta.url);
const __filename = _ftu(import.meta.url);
const __dirname = _dn(__filename);
`.trim(),
  },
  format: "esm", // Use ESM so top-level await in dynamic imports works
  outExtension: { ".js": ".mjs" },
  outfile: undefined,
  outdir: undefined,
});

// Actually use ESM (mjs) for all three to avoid top-level-await restrictions:
await Promise.all([
  // Local server — ESM so top-level await in dynamic imports works
  build({
    ...sharedOpts,
    entryPoints: ["server/index-local.ts"],
    outfile: "dist/index-local.mjs",
    format: "esm",
    external: ["vite", "vite-plugin-pwa", "@vitejs/*", "@replit/*", "better-sqlite3"],
  }),

  // Electron main process — CJS (Electron default)
  build({
    ...sharedOpts,
    entryPoints: ["electron/main.ts"],
    outfile: "electron/main.cjs",
    format: "cjs",
    external: ["electron"],
    banner: {
      // Provide __dirname for code that references it
      js: `const __filename = require('path').resolve(process.argv[1]); const __dirname = require('path').dirname(__filename);`,
    },
  }),

  // Preload — CJS, output as .js so Electron finds it with standard reference
  build({
    ...sharedOpts,
    entryPoints: ["electron/preload.ts"],
    outfile: "electron/preload.js",  // referenced as preload.js in main.ts
    format: "cjs",
    external: ["electron"],
  }),
]);

console.log("✅ Electron files built successfully");
console.log("   dist/index-local.mjs  — local server (ESM)");
console.log("   electron/main.cjs      — Electron main process (CJS)");
console.log("   electron/preload.js    — Electron preload (CJS)");
