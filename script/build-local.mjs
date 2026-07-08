/**
 * Builds the Electron-specific files (local server + main process + preload).
 * Run: npm run electron:build:server
 */
import { build } from "esbuild";
import { readFile } from "fs/promises";

const pkg = JSON.parse(await readFile("package.json", "utf-8"));

// All npm deps are external — they live in node_modules at runtime inside the asar
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
  ...Object.keys(pkg.optionalDependencies || {}),
  "electron",
];

const sharedOpts = {
  bundle: true,
  external,
  platform: "node",
  logLevel: "info",
};

// Build all three Electron artifacts in parallel
await Promise.all([
  // Local server — ESM so top-level await works
  build({
    ...sharedOpts,
    entryPoints: ["server/index-local.ts"],
    outfile: "dist/index-local.mjs",
    format: "esm",
  }),

  // Electron main process — CJS (Electron default)
  build({
    ...sharedOpts,
    entryPoints: ["electron/main.ts"],
    outfile: "electron/main.cjs",
    format: "cjs",
    banner: {
      js: `const __filename = require('path').resolve(process.argv[1]); const __dirname = require('path').dirname(__filename);`,
    },
  }),

  // Preload — CJS, output as .js so Electron finds it
  build({
    ...sharedOpts,
    entryPoints: ["electron/preload.ts"],
    outfile: "electron/preload.js",
    format: "cjs",
  }),
]);

console.log("✅ Electron files built successfully");
console.log("   dist/index-local.mjs  — local server (ESM)");
console.log("   electron/main.cjs      — Electron main process (CJS)");
console.log("   electron/preload.js    — Electron preload (CJS)");
