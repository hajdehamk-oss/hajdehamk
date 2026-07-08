import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";
import { transform as esbuildTransform } from "esbuild";

// Plugin to transform TypeScript files outside the Vite root (e.g. shared/).
// On Windows, Vite's built-in esbuild plugin only handles files inside the root
// directory; files outside fall through to vite:load-fallback which can't parse TS.
const transformSharedTs = {
  name: "transform-shared-ts",
  async transform(code: string, id: string) {
    if (id.endsWith(".ts") && !id.endsWith(".d.ts") && id.includes("/shared/")) {
      const result = await esbuildTransform(code, { loader: "ts", target: "es2020" });
      return { code: result.code, map: result.map || null };
    }
  },
};

export default defineConfig({
  plugins: [
    transformSharedTs,
    react({
      jsxRuntime: "automatic",
      babel: { plugins: [] },
    }),
    runtimeErrorOverlay(),
    ...(process.env.ELECTRON_BUILD === "true" ? [] : [VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "icon-192.webp", "icon-512.webp"],
      manifest: {
        name: "HAJDE HA",
        short_name: "HAJDE HA",
        description: "Platforma e Menusë Dixhitale e Maqedonisë",
        theme_color: "#E8450A",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        lang: "sq",
        icons: [
          {
            src: "/icon-192.webp",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icon-512.webp",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Never cache API routes — always hit the network for fresh data.
            // Cache-Control headers on the server handle any caching instead.
            urlPattern: /\/api\/.*/i,
            handler: "NetworkOnly",
            options: {
              cacheName: "api-no-cache",
            },
          },
          {
            urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|webp|svg)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: /^https:\/\/api\.qrserver\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "qr-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
        ],
      },
    })]),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src").replace(/\\/g, "/"),
      "@shared/schema": path.resolve(import.meta.dirname, "shared", "schema.ts").replace(/\\/g, "/"),
      "@shared/routes": path.resolve(import.meta.dirname, "shared", "routes.ts").replace(/\\/g, "/"),
      "@shared": path.resolve(import.meta.dirname, "shared").replace(/\\/g, "/"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    minify: "esbuild",
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-core": ["react", "react-dom"],
          router: ["wouter"],
          query: ["@tanstack/react-query"],
          "ui-icons": ["lucide-react"],
          "ui-motion": ["framer-motion"],
        },
        entryFileNames: "assets/[name].[hash].js",
        chunkFileNames: "assets/[name].[hash].js",
        assetFileNames: "assets/[name].[hash].[ext]",
      },
    },
    target: "es2020",
    cssCodeSplit: true,
    cssMinify: true,
  },
  server: {
    fs: { strict: true, deny: ["**/.*"] },
    hmr: { overlay: true },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "wouter",
      "@tanstack/react-query",
      "lucide-react",
      "framer-motion",
      "leaflet",
    ],
  },
  esbuild: {
    drop: process.env.NODE_ENV === "production" ? ["console", "debugger"] : [],
    target: "es2020",
  },
});
