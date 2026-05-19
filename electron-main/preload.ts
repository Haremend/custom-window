import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getFolderStats: (folderPath: string) => ipcRenderer.invoke('get-folder-stats', folderPath),
  getImagesInFolder: (folderPath: string) => ipcRenderer.invoke('get-images-in-folder', folderPath),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config: any) => ipcRenderer.invoke('save-config', config),
  readLogFile: () => ipcRenderer.invoke('read-log-file'),
  writeLogFile: (logData: string) => ipcRenderer.invoke('write-log-file', logData)
})