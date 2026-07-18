import { app, BrowserWindow, ipcMain, shell, Menu } from "electron";
import { spawn, type ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import http from "http";

// __dirname is available in the CJS build output (injected by esbuild)
declare const __dirname: string;

// ── Config paths ───────────────────────────────────────────────────────────────
const CONFIG_PATH = path.join(app.getPath("userData"), "hajdeha-config.json");
const DB_PATH = path.join(app.getPath("userData"), "hajdeha-local.db");

interface LocalConfig {
  slug: string;
  pusherKey?: string;
  pusherCluster?: string;
}

function loadConfig(): LocalConfig | null {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    }
  } catch {}
  return null;
}

// ── Single instance lock ───────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}
app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// ── Server process ─────────────────────────────────────────────────────────────
let serverProcess: ChildProcess | null = null;
const PORT = 5050; // Use 5050 for local app to avoid conflict with dev server

function startServer(config: LocalConfig | null): Promise<void> {
  return new Promise((resolve, reject) => {
    const serverScript = app.isPackaged
      ? path.join(process.resourcesPath, "app.asar", "dist", "index-local.mjs")
      : path.join(__dirname, "../server/index-local.ts");

    const command = app.isPackaged
      ? process.execPath
      : "node_modules/.bin/tsx";

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      NODE_ENV: app.isPackaged ? "production" : "development",
      PORT: String(PORT),
      LOCAL_DB_PATH: DB_PATH,
      LOCAL_CONFIG_PATH: CONFIG_PATH,
      IS_ELECTRON: "true",
    };

    // Without this, Electron's execPath spawns another full Electron window
    // instead of running the script as plain Node.
    if (app.isPackaged) {
      env.ELECTRON_RUN_AS_NODE = "1";
      // Let the server find the built frontend assets inside the asar
      env.STATIC_DIST_PATH = path.join(
        process.resourcesPath,
        "app.asar",
        "dist",
        "public"
      );
    }

    if (config?.pusherKey) env.VITE_PUSHER_KEY = config.pusherKey;
    if (config?.pusherCluster) env.VITE_PUSHER_CLUSTER = config.pusherCluster;

    serverProcess = spawn(command, [serverScript], { env, stdio: "pipe" });

    serverProcess.stdout?.on("data", (d) => process.stdout.write("[server] " + d));
    serverProcess.stderr?.on("data", (d) => process.stderr.write("[server] " + d));
    serverProcess.on("error", reject);

    // Poll until the server is ready
    let attempts = 0;
    const check = setInterval(() => {
      http.get(`http://localhost:${PORT}/api/local/config`, (res) => {
        if (res.statusCode === 200) {
          clearInterval(check);
          resolve();
        }
      }).on("error", () => {
        if (++attempts > 60) {
          clearInterval(check);
          reject(new Error("Server failed to start"));
        }
      });
    }, 500);
  });
}

// ── Windows ────────────────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null;
let setupWindow: BrowserWindow | null = null;

function createSetupWindow() {
  setupWindow = new BrowserWindow({
    width: 560,
    height: 620,
    resizable: false,
    title: "Hajde Ha POS — Setup",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });
  setupWindow.loadFile(path.join(__dirname, "setup.html"));
  setupWindow.on("closed", () => { setupWindow = null; });
}

function createMainWindow(slug: string) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    title: "Hajde Ha POS",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://localhost:${PORT}/pos/${slug}`);

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });

  // Simple menu
  const menu = Menu.buildFromTemplate([
    {
      label: "File",
      submenu: [
        {
          label: "Sync from Cloud",
          click: () => {
            fetch(`http://localhost:${PORT}/api/local/sync`, { method: "POST" })
              .then(() => mainWindow?.reload())
              .catch(console.error);
          },
        },
        { type: "separator" },
        { label: "Quit", accelerator: "CmdOrCtrl+Q", click: () => app.quit() },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);

  mainWindow.on("closed", () => { mainWindow = null; });
}

// ── IPC Handlers ───────────────────────────────────────────────────────────────
ipcMain.handle("get-config", () => loadConfig());

ipcMain.handle("save-config", (_event, config: LocalConfig) => {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  return { ok: true };
});

ipcMain.handle("restart-app", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  app.relaunch();
  app.exit(0);
});

// ── App lifecycle ──────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  const config = loadConfig();

  try {
    await startServer(config);
  } catch (err) {
    console.error("Failed to start server:", err);
  }

  if (!config) {
    createSetupWindow();
  } else {
    createMainWindow(config.slug);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const cfg = loadConfig();
      if (cfg) createMainWindow(cfg.slug);
      else createSetupWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
