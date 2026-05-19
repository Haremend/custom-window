import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getFolderStats: (folderPath: string) => ipcRenderer.invoke('get-folder-stats', folderPath),
  getImagesInFolder: (folderPath: string) => ipcRenderer.invoke('get-images-in-folder', folderPath)
})