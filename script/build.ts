import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";


async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));

  // Make ALL dependencies external — node_modules are available at runtime on Vercel
  // This dramatically reduces bundle size and cold start times
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
    // Tree-shake unused exports
    treeShaking: true,
    target: "node18",
  });

  console.log("build complete ✅");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
