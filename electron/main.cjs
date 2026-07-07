const __filename = require('path').resolve(process.argv[1]); const __dirname = require('path').dirname(__filename);
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron = require("electron");
var import_child_process = require("child_process");
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_http = __toESM(require("http"), 1);
var CONFIG_PATH = import_path.default.join(import_electron.app.getPath("userData"), "hajdeha-config.json");
var DB_PATH = import_path.default.join(import_electron.app.getPath("userData"), "hajdeha-local.db");
function loadConfig() {
  try {
    if (import_fs.default.existsSync(CONFIG_PATH)) {
      return JSON.parse(import_fs.default.readFileSync(CONFIG_PATH, "utf-8"));
    }
  } catch {
  }
  return null;
}
var serverProcess = null;
var PORT = 5050;
function startServer(config) {
  return new Promise((resolve, reject) => {
    const serverScript = import_electron.app.isPackaged ? import_path.default.join(process.resourcesPath, "index-local.mjs") : import_path.default.join(__dirname, "../server/index-local.ts");
    const command = import_electron.app.isPackaged ? process.execPath : "node_modules/.bin/tsx";
    const env = {
      ...process.env,
      NODE_ENV: import_electron.app.isPackaged ? "production" : "development",
      PORT: String(PORT),
      LOCAL_DB_PATH: DB_PATH,
      LOCAL_CONFIG_PATH: CONFIG_PATH,
      IS_ELECTRON: "true"
    };
    if (config) {
      env.VITE_PUSHER_KEY = config.pusherKey;
      env.VITE_PUSHER_CLUSTER = config.pusherCluster;
    }
    serverProcess = (0, import_child_process.spawn)(command, [serverScript], { env, stdio: "pipe" });
    serverProcess.stdout?.on("data", (d) => process.stdout.write("[server] " + d));
    serverProcess.stderr?.on("data", (d) => process.stderr.write("[server] " + d));
    serverProcess.on("error", reject);
    let attempts = 0;
    const check = setInterval(() => {
      import_http.default.get(`http://localhost:${PORT}/api/local/config`, (res) => {
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
var mainWindow = null;
var setupWindow = null;
function createSetupWindow() {
  setupWindow = new import_electron.BrowserWindow({
    width: 560,
    height: 620,
    resizable: false,
    title: "Hajde Ha POS \u2014 Setup",
    webPreferences: {
      preload: import_path.default.join(__dirname, "preload.js"),
      contextIsolation: true
    }
  });
  setupWindow.loadFile(import_path.default.join(__dirname, "setup.html"));
  setupWindow.on("closed", () => {
    setupWindow = null;
  });
}
function createMainWindow(slug) {
  mainWindow = new import_electron.BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    title: "Hajde Ha POS",
    webPreferences: {
      preload: import_path.default.join(__dirname, "preload.js"),
      contextIsolation: true
    }
  });
  mainWindow.loadURL(`http://localhost:${PORT}/pos/${slug}`);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) import_electron.shell.openExternal(url);
    return { action: "deny" };
  });
  const menu = import_electron.Menu.buildFromTemplate([
    {
      label: "File",
      submenu: [
        {
          label: "Sync from Cloud",
          click: () => {
            fetch(`http://localhost:${PORT}/api/local/sync`, { method: "POST" }).then(() => mainWindow?.reload()).catch(console.error);
          }
        },
        { type: "separator" },
        { label: "Quit", accelerator: "CmdOrCtrl+Q", click: () => import_electron.app.quit() }
      ]
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
        { role: "togglefullscreen" }
      ]
    }
  ]);
  import_electron.Menu.setApplicationMenu(menu);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
import_electron.ipcMain.handle("get-config", () => loadConfig());
import_electron.ipcMain.handle("save-config", (_event, config) => {
  import_fs.default.mkdirSync(import_path.default.dirname(CONFIG_PATH), { recursive: true });
  import_fs.default.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  return { ok: true };
});
import_electron.ipcMain.handle("restart-app", () => {
  import_electron.app.relaunch();
  import_electron.app.exit(0);
});
import_electron.app.whenReady().then(async () => {
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
  import_electron.app.on("activate", () => {
    if (import_electron.BrowserWindow.getAllWindows().length === 0) {
      const cfg = loadConfig();
      if (cfg) createMainWindow(cfg.slug);
      else createSetupWindow();
    }
  });
});
import_electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") import_electron.app.quit();
});
import_electron.app.on("will-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
