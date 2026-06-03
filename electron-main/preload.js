"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    selectFolder: () => electron_1.ipcRenderer.invoke('select-folder'),
    getFolderStats: (folderPath) => electron_1.ipcRenderer.invoke('get-folder-stats', folderPath),
    getImagesInFolder: (folderPath) => electron_1.ipcRenderer.invoke('get-images-in-folder', folderPath),
    loadConfig: () => electron_1.ipcRenderer.invoke('load-config'),
    saveConfig: (config) => electron_1.ipcRenderer.invoke('save-config', config),
    readLogFile: () => electron_1.ipcRenderer.invoke('read-log-file'),
    writeLogFile: (logData) => electron_1.ipcRenderer.invoke('write-log-file', logData),
    getImageDataUrl: (imagePath) => electron_1.ipcRenderer.invoke('get-image-data-url', imagePath),
    getThumbnail: (imagePath) => electron_1.ipcRenderer.invoke('get-thumbnail', imagePath),
    generateThumbnails: (imagePaths) => electron_1.ipcRenderer.invoke('generate-thumbnails', imagePaths),
});
