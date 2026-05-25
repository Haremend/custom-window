import { app, BrowserWindow, ipcMain, dialog, protocol, session } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { app as electronApp } from 'electron'
import sharp from 'sharp'
import crypto from 'crypto'

const __dirname = path.resolve()

// 日志文件路径
const LOG_FILE_PATH = path.join(electronApp.getPath('userData'), 'image-manager-logs.json')

// 注册特权协议
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      allowServiceWorkers: true,
      corsEnabled: true,
      stream: true
    }
  }
])

// 图片文件扩展名
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // 禁用web安全策略以允许本地文件访问
      allowRunningInsecureContent: true // 允许运行不安全内容
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

// 日志文件操作
ipcMain.handle('read-log-file', async () => {
  try {
    const data = await fs.readFile(LOG_FILE_PATH, 'utf8')
    return data
  } catch (error) {
    // 文件不存在时返回null
    if (error.code === 'ENOENT') {
      return null
    }
    console.error('读取日志文件失败:', error)
    throw error
  }
})

ipcMain.handle('write-log-file', async (_, logData: string) => {
  try {
    await fs.writeFile(LOG_FILE_PATH, logData, 'utf8')
  } catch (error) {
    console.error('写入日志文件失败:', error)
    throw error
  }
})

// 配置持久化文件路径
const CONFIG_FILE_PATH = path.join(electronApp.getPath('userData'), 'config.json')

// 缩略图缓存路径 - 放在项目目录下的 picTemp 文件夹
const THUMBNAIL_CACHE_PATH = path.join(__dirname, '..', 'picTemp')

// 确保缩略图缓存目录存在
async function ensureThumbnailCache() {
  try {
    await fs.access(THUMBNAIL_CACHE_PATH)
  } catch {
    await fs.mkdir(THUMBNAIL_CACHE_PATH, { recursive: true })
  }
}

// 初始化时确保缓存目录存在（不等待）
ensureThumbnailCache().catch(error => {
  console.error('[Electron Main] Failed to create thumbnail cache directory:', error.message)
})

// 生成缩略图
async function generateThumbnail(imagePath: string): Promise<string> {

  // 使用文件路径的哈希作为缓存文件名
  const hash = crypto.createHash('md5').update(imagePath).digest('hex')
  const thumbnailPath = path.join(THUMBNAIL_CACHE_PATH, `${hash}.webp`)

  try {
    // 检查缓存是否存在且原图未修改
    const [thumbnailExists, imageStats] = await Promise.all([
      fs.access(thumbnailPath).then(() => true).catch(() => false),
      fs.stat(imagePath)
    ])

    if (thumbnailExists) {
      const thumbnailStats = await fs.stat(thumbnailPath)
      // 如果缩略图比原图新，直接使用缓存
      if (thumbnailStats.mtime >= imageStats.mtime) {
        return thumbnailPath
      }
    }

    // 生成新的缩略图
    await sharp(imagePath)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(thumbnailPath)

    return thumbnailPath
  } catch (error) {
    console.error('Error generating thumbnail:', error)
    throw error
  }
}

ipcMain.handle('load-config', async () => {
  try {
    const data = await fs.readFile(CONFIG_FILE_PATH, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    // 文件不存在时返回null
    if (error.code === 'ENOENT') {
      return null
    }
    console.error('加载配置失败:', error)
    return null
  }
})

ipcMain.handle('save-config', async (_, config: any) => {
  try {
    await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf8')
  } catch (error) {
    console.error('保存配置失败:', error)
    throw error
  }
})

// 获取图片的 Data URL
// 获取图片的 Data URL
ipcMain.handle('get-image-data-url', async (_, imagePath: string) => {
  try {
    console.log('[Electron Main] Reading image for Data URL:', imagePath)
    const data = await fs.readFile(imagePath)
    const base64 = data.toString('base64')
    const ext = path.extname(imagePath).toLowerCase()
    const mimeType = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    }[ext] || 'image/png'

    const dataUrl = `data:${mimeType};base64,${base64}`
    console.log('[Electron Main] Generated Data URL for:', imagePath, 'Size:', base64.length)
    return dataUrl
  } catch (error) {
    console.error('[Electron Main] Error reading image:', imagePath, error.message)
    throw error
  }
})

// 获取缩略图路径
ipcMain.handle('get-thumbnail', async (_, imagePath: string) => {
  try {
    const thumbnailPath = await generateThumbnail(imagePath)
    return thumbnailPath
  } catch (error) {
    console.error('[Electron Main] Error getting thumbnail:', imagePath, error.message)
    throw error
  }
})

// 批量生成缩略图
ipcMain.handle('generate-thumbnails', async (_, imagePaths: string[]) => {
  try {
    const results = []
    for (const imagePath of imagePaths) {
      try {
        const thumbnailPath = await generateThumbnail(imagePath)
        results.push({
          originalPath: imagePath,
          thumbnailPath,
          success: true
        })
      } catch (error) {
        results.push({
          originalPath: imagePath,
          error: error.message,
          success: false
        })
      }
    }
    return results
  } catch (error) {
    console.error('[Electron Main] Error generating thumbnails:', error.message)
    throw error
  }
})

app.whenReady().then(async () => {
  // 确保缩略图缓存目录存在
  await ensureThumbnailCache()

  // 注册自定义协议（带安全验证）
  protocol.registerFileProtocol('app', (request, callback) => {
    console.log('[Electron Main] App protocol request:', request.url)
    const url = request.url.replace('app://', '')
    const decodedPath = decodeURIComponent(url)
    const resolvedPath = path.resolve(decodedPath)

    console.log('[Electron Main] Serving file:', resolvedPath)

    // 安全验证：确保请求的文件路径在允许的目录内
    const allowedBasePath = path.resolve(__dirname, '..', 'picTemp')

    if (!resolvedPath.startsWith(allowedBasePath)) {
      console.error('[Electron Main] Access denied for path:', resolvedPath)
      console.error('[Electron Main] Allowed base path:', allowedBasePath)
      callback({ error: 'net::ERR_ACCESS_DENIED' })
      return
    }

    // 检查文件是否存在
    fs.access(resolvedPath).then(() => {
      console.log('[Electron Main] File exists, serving:', resolvedPath)
      callback({ path: resolvedPath })
    }).catch((error) => {
      console.error('[Electron Main] File not found:', resolvedPath, error.message)
      callback({ error: 'net::ERR_FILE_NOT_FOUND' })
    })
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})