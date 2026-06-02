/*
 * 图像管理器Electron应用的主要进程。
 *
 * 提供以下关键功能：
 * - createWindow(): 创建主BrowserWindow，加载开发服务器或构建后的index文件，打开开发者工具。
 * - IPC处理程序：
 *   - select-folder: 打开文件夹选择器。
 *   - get-folder-stats: 返回子文件夹中的图像数量。
 *   - get-images-in-folder: 列出文件夹中的图像文件。
 *   - load-config / save-config: 管理用户配置文件。
 *   - get-image-data-url: 返回图像的数据URL。
 *   - select-image: 打开图像选择器。
 *   - get-thumbnail / generate-thumbnails: 管理缩略图缓存和生成。
 * - 注册'local'和'app'协议。
 * - 应用生命周期：ready，activate，window-all-closed处理。
 *
 * 常量：
 * - IMAGE_EXTENSIONS: 支持的图像文件扩展名。
 * - CONFIG_PATH: 配置文件在用户主目录中的路径。
 */
const { app, BrowserWindow, ipcMain, dialog, protocol, session } = require('electron')
const path = require('path')
const fs = require('fs').promises
const os = require('os')

// 图片文件扩展名
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']

// 配置文件路径
const CONFIG_PATH = path.join(os.homedir(), '.image-manager-config.json')

/**
 * 创建并展示主窗口。
 * - 加载开发服务器或本地构建的页面。
 * - 打开开发者工具供调试。
 */
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

  // 添加错误处理和开发者工具
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription)
  })

  win.webContents.on('console-message', (event, level, message, line, source) => {
    console.log('Renderer console:', message)
  })

  // 优先尝试开发服务器，如果失败则使用构建版本
  const devServerUrl = 'http://localhost:5173'
  const indexPath = path.join(__dirname, '../dist/index.html')
  const fileUrl = 'file://' + indexPath

  // 添加错误处理
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', {
      errorCode,
      errorDescription,
      validatedURL
    })
    // 如果开发服务器失败，回退到文件
    if (validatedURL.includes('localhost:5173')) {
      console.log('Dev server failed, falling back to file...')
      win.loadURL(fileUrl)
    }
  })

  win.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully')
    // 临时打开开发者工具查看错误
    win.webContents.openDevTools()
  })

  // 先尝试开发服务器
  console.log('Trying dev server first...')
  win.loadURL(devServerUrl)

  // 打开开发者工具以便调试
  win.webContents.openDevTools()
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

ipcMain.handle('get-folder-stats', async (event, folderPath) => {
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

ipcMain.handle('get-images-in-folder', async (event, folderPath) => {
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

// 配置管理IPC处理
ipcMain.handle('load-config', async () => {
  try {
    const configData = await fs.readFile(CONFIG_PATH, 'utf8')
    return JSON.parse(configData)
  } catch (error) {
    console.log('No existing config found or error reading config:', error.message)
    return { watchedPaths: [] }
  }
})

ipcMain.handle('save-config', async (event, config) => {
  try {
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8')
    return true
  } catch (error) {
    console.error('Error saving config:', error)
    return false
  }
})

ipcMain.handle('get-image-data-url', async (event, imagePath) => {
  try {
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
    return dataUrl
  } catch (error) {
    console.error('Error reading image file:', imagePath, error.message)
    throw error
  }
})

ipcMain.handle('select-image', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] }]
  })

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

// 缩略图相关IPC处理器
ipcMain.handle('get-thumbnail', async (_, imagePath) => {
  try {
    const thumbnailDir = path.join(os.homedir(), '.image-manager-thumbnails')
    const thumbnailName = `${Buffer.from(imagePath).toString('base64')}.webp`
    const thumbnailPath = path.join(thumbnailDir, thumbnailName)

    // 检查缩略图是否已存在
    try {
      await fs.access(thumbnailPath)
      return thumbnailPath
    } catch {
      // 缩略图不存在，返回空字符串让调用者处理
      return ''
    }
  } catch (error) {
    console.error('Error getting thumbnail:', error)
    return ''
  }
})

ipcMain.handle('generate-thumbnails', async (_, imagePaths) => {
  const results = []

  try {
    const thumbnailDir = path.join(os.homedir(), '.image-manager-thumbnails')

    // 确保缩略图目录存在
    try {
      await fs.access(thumbnailDir)
    } catch {
      await fs.mkdir(thumbnailDir, { recursive: true })
    }

    for (const imagePath of imagePaths) {
      try {
        const thumbnailName = `${Buffer.from(imagePath).toString('base64')}.webp`
        const thumbnailPath = path.join(thumbnailDir, thumbnailName)

        // 检查缩略图是否已存在
        try {
          await fs.access(thumbnailPath)
          results.push({
            originalPath: imagePath,
            thumbnailPath: thumbnailPath,
            success: true
          })
          continue
        } catch {
          // 缩略图不存在，需要生成
        }

        // 生成缩略图
        const sharp = require('sharp')
        await sharp(imagePath)
          .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(thumbnailPath)

        results.push({
          originalPath: imagePath,
          thumbnailPath: thumbnailPath,
          success: true
        })
      } catch (error) {
        console.error('Error generating thumbnail for', imagePath, ':', error)
        results.push({
          originalPath: imagePath,
          thumbnailPath: '',
          success: false,
          error: error.message
        })
      }
    }

    return results
  } catch (error) {
    console.error('Error in generate-thumbnails:', error)
    return imagePaths.map(imagePath => ({
      originalPath: imagePath,
      thumbnailPath: '',
      success: false,
      error: error.message
    }))
  }
})

// 注册自定义协议来处理本地文件
protocol.registerSchemesAsPrivileged([
  { scheme: 'local', privileges: { secure: true, standard: true, supportFetchAPI: true } },
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true } }
])

app.whenReady().then(() => {
  // 注册自定义协议处理器
  protocol.handle('local', (request) => {
    const url = new URL(request.url)
    const filePath = decodeURIComponent(url.pathname)
    return fs.readFile(filePath)
  })

  // 注册 app:// 协议处理器用于访问缩略图
  protocol.handle('app', (request) => {
    const url = new URL(request.url)
    const filePath = decodeURIComponent(url.pathname)
    return fs.readFile(filePath)
  })

  // 拦截资源请求，修复路径问题
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const { url } = details

    // 修复绝对路径的资源请求
    if (url.includes('/assets/') && url.startsWith('file://')) {
      const assetsPath = url.replace('file://', '').replace('/assets/', 'assets/')
      callback({ redirectURL: 'file://' + path.resolve(__dirname, '..', assetsPath) })
    } else {
      callback({})
    }
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})