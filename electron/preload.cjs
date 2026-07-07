"use strict";

// electron/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electronAPI", {
  getConfig: () => import_electron.ipcRenderer.invoke("get-config"),
  saveConfig: (config) => import_electron.ipcRenderer.invoke("save-config", config),
  restartApp: () => import_electron.ipcRenderer.invoke("restart-app")
});
