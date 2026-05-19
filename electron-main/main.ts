import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs/promises'

const __dirname = path.resolve()

// 图片文件扩展名
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// IPC handlers
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

ipcMain.handle('get-folder-stats', async (_, folderPath: string) => {
  try {
    const stats = await fs.stat(folderPath)
    if (!stats.isDirectory()) {
      return null
    }

    const items = await fs.readdir(folderPath)
    const subfolders = []

    for (const item of items) {
      const itemPath = path.join(folderPath, item)
      const itemStats = await fs.stat(itemPath)

      if (itemStats.isDirectory()) {
        // 统计子文件夹中的图片数量
        let imageCount = 0
        try {
          const subItems = await fs.readdir(itemPath)
          for (const subItem of subItems) {
            const ext = path.extname(subItem).toLowerCase()
            if (IMAGE_EXTENSIONS.includes(ext)) {
              imageCount++
            }
          }
        } catch (error) {
          console.error(`Error reading subfolder ${itemPath}:`, error)
        }

        subfolders.push({
          name: item,
          path: itemPath,
          imageCount,
          lastModified: itemStats.mtime
        })
      }
    }

    // 按图片数量排序（降序）
    subfolders.sort((a, b) => b.imageCount - a.imageCount)

    return {
      path: folderPath,
      subfolders
    }
  } catch (error) {
    console.error('Error getting folder stats:', error)
    return null
  }
})

ipcMain.handle('get-images-in-folder', async (_, folderPath: string) => {
  try {
    const items = await fs.readdir(folderPath)
    const images = []

    for (const item of items) {
      const itemPath = path.join(folderPath, item)
      const stats = await fs.stat(itemPath)

      if (stats.isFile()) {
        const ext = path.extname(item).toLowerCase()
        if (IMAGE_EXTENSIONS.includes(ext)) {
          images.push({
            name: item,
            path: itemPath,
            size: stats.size,
            lastModified: stats.mtime
          })
        }
      }
    }

    return images
  } catch (error) {
    console.error('Error getting images in folder:', error)
    return []
  }
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})