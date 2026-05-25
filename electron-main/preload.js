"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    selectFolder: function () { return electron_1.ipcRenderer.invoke('select-folder'); },
    getFolderStats: function (folderPath) { return electron_1.ipcRenderer.invoke('get-folder-stats', folderPath); },
    getImagesInFolder: function (folderPath) { return electron_1.ipcRenderer.invoke('get-images-in-folder', folderPath); },
    loadConfig: function () { return electron_1.ipcRenderer.invoke('load-config'); },
    saveConfig: function (config) { return electron_1.ipcRenderer.invoke('save-config', config); },
    readLogFile: function () { return electron_1.ipcRenderer.invoke('read-log-file'); },
    writeLogFile: function (logData) { return electron_1.ipcRenderer.invoke('write-log-file', logData); },
    getImageDataUrl: function (imagePath) { return electron_1.ipcRenderer.invoke('get-image-data-url', imagePath); },
    getThumbnail: function (imagePath) { return electron_1.ipcRenderer.invoke('get-thumbnail', imagePath); },
    generateThumbnails: function (imagePaths) { return electron_1.ipcRenderer.invoke('generate-thumbnails', imagePaths); }
});
