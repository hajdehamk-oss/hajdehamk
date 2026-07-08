/**
 * Builds the React frontend for the Electron app.
 * Skips vite-plugin-pwa (not needed for Electron, and has a Windows path bug).
 */
import { build as viteBuild } from "vite";
import { build as esbuild } from "esbuild";
import { rm, readFile } from "fs/promises";

// Must be set before viteBuild() loads vite.config.ts
process.env.ELECTRON_BUILD = "true";

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client (Electron)...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));

  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
    ...Object.keys(pkg.optionalDependencies || {}),
  ];

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: allDeps,
    logLevel: "info",
    treeShaking: true,
    target: "node18",
  });

  console.log("build complete ✅");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
