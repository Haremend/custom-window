const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getFolderStats: (folderPath) => ipcRenderer.invoke('get-folder-stats', folderPath),
  getImagesInFolder: (folderPath) => ipcRenderer.invoke('get-images-in-folder', folderPath),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  readLogFile: () => ipcRenderer.invoke('read-log-file'),
  writeLogFile: (logData) => ipcRenderer.invoke('write-log-file', logData),
  getImageDataUrl: (imagePath) => ipcRenderer.invoke('get-image-data-url', imagePath)
})