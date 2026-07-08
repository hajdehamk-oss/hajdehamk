/**
 * Builds the React frontend for the Electron app.
 * Skips vite-plugin-pwa (not needed for Electron, and has a Windows path bug).
 */
import { build as viteBuild } from "vite";
import { rm } from "fs/promises";

// Must be set before viteBuild() loads vite.config.ts
process.env.ELECTRON_BUILD = "true";

async function buildFrontend() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client (Electron)...");
  await viteBuild();

  console.log("frontend build complete ✅");
}

buildFrontend().catch((err) => {
  console.error(err);
  process.exit(1);
});
