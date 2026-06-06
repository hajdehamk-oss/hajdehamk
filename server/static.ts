import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // Use process.cwd() for CommonJS compatibility instead of __dirname
  const distPath = path.resolve(process.cwd(), "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve sitemap with correct MIME type (must be before express.static)
  app.get("/sitemap.xml", (_req, res) => {
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    const sitemapPath = path.join(distPath, "sitemap.xml");
    if (fs.existsSync(sitemapPath)) {
      return res.sendFile(sitemapPath);
    }
    return res.status(404).send("Sitemap not found");
  });

  // Serve robots.txt with correct MIME type
  app.get("/robots.txt", (_req, res) => {
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Cache-Control", "public, max-age=3600");
    const robotsPath = path.join(distPath, "robots.txt");
    if (fs.existsSync(robotsPath)) {
      return res.sendFile(robotsPath);
    }
    return res.status(404).send("Robots.txt not found");
  });

  // Serve PWA manifest with correct MIME type
  app.get("/manifest.json", (_req, res) => {
    res.setHeader("Content-Type", "application/manifest+json");
    const manifestPath = path.join(distPath, "manifest.json");
    if (fs.existsSync(manifestPath)) {
      return res.sendFile(manifestPath);
    }
    return res.status(404).send("Manifest not found");
  });

  // Serve service worker with correct headers
  app.get("/service-worker.js", (_req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Service-Worker-Allowed", "/");
    res.setHeader("Cache-Control", "no-cache");
    const swPath = path.join(distPath, "service-worker.js");
    if (fs.existsSync(swPath)) {
      return res.sendFile(swPath);
    }
    return res.status(404).send("Service worker not found");
  });

  // Serve static files with proper caching
  // Exclude sitemap.xml and robots.txt from static middleware
  app.use(
    express.static(distPath, {
      maxAge: "30d",
      etag: true,
      lastModified: true,
      index: false, // Don't serve index.html from static
      setHeaders: (res, filepath) => {
        // Don't let static middleware handle these files
        if (
          filepath.endsWith("sitemap.xml") ||
          filepath.endsWith("robots.txt")
        ) {
          return;
        }
        if (filepath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache");
        } else {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );

  // SPA fallback - serve index.html for all other routes
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
