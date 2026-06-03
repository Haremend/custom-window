"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const electron_2 = require("electron");
const sharp_1 = __importDefault(require("sharp"));
const crypto_1 = __importDefault(require("crypto"));
const __dirname = path_1.default.resolve();
// 日志文件路径
const LOG_FILE_PATH = path_1.default.join(electron_2.app.getPath('userData'), 'image-manager-logs.json');
// 注册特权协议
electron_1.protocol.registerSchemesAsPrivileged([
    {
        scheme: 'local',
        privileges: {
            secure: true,
            standard: true,
            supportFetchAPI: true,
            allowServiceWorkers: true,
            corsEnabled: true,
            stream: true,
        },
    },
]);
// 图片文件扩展名
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
function createWindow() {
    const win = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false, // 禁用web安全策略以允许本地文件访问
            allowRunningInsecureContent: true, // 允许运行不安全内容
        },
    });
    if (process.env.NODE_ENV === 'development') {
        win.loadURL('http://localhost:5173');
    }
    else {
        win.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
}
// IPC handlers
electron_1.ipcMain.handle('select-folder', async () => {
    const result = await electron_1.dialog.showOpenDialog({
        properties: ['openDirectory'],
    });
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});
electron_1.ipcMain.handle('get-folder-stats', async (_, folderPath) => {
    try {
        const stats = await promises_1.default.stat(folderPath);
        if (!stats.isDirectory()) {
            return null;
        }
        const items = await promises_1.default.readdir(folderPath);
        const subfolders = [];
        for (const item of items) {
            const itemPath = path_1.default.join(folderPath, item);
            const itemStats = await promises_1.default.stat(itemPath);
            if (itemStats.isDirectory()) {
                // 统计子文件夹中的图片数量
                let imageCount = 0;
                try {
                    const subItems = await promises_1.default.readdir(itemPath);
                    for (const subItem of subItems) {
                        const ext = path_1.default.extname(subItem).toLowerCase();
                        if (IMAGE_EXTENSIONS.includes(ext)) {
                            imageCount++;
                        }
                    }
                }
                catch (error) {
                    console.error(`Error reading subfolder ${itemPath}:`, error);
                }
                subfolders.push({
                    name: item,
                    path: itemPath,
                    imageCount,
                    lastModified: itemStats.mtime,
                });
            }
        }
        // 按图片数量排序（降序）
        subfolders.sort((a, b) => b.imageCount - a.imageCount);
        return {
            path: folderPath,
            subfolders,
        };
    }
    catch (error) {
        console.error('Error getting folder stats:', error);
        return null;
    }
});
electron_1.ipcMain.handle('get-images-in-folder', async (_, folderPath) => {
    try {
        const items = await promises_1.default.readdir(folderPath);
        const images = [];
        for (const item of items) {
            const itemPath = path_1.default.join(folderPath, item);
            const stats = await promises_1.default.stat(itemPath);
            if (stats.isFile()) {
                const ext = path_1.default.extname(item).toLowerCase();
                if (IMAGE_EXTENSIONS.includes(ext)) {
                    images.push({
                        name: item,
                        path: itemPath,
                        size: stats.size,
                        lastModified: stats.mtime,
                    });
                }
            }
        }
        return images;
    }
    catch (error) {
        console.error('Error getting images in folder:', error);
        return [];
    }
});
// 日志文件操作
electron_1.ipcMain.handle('read-log-file', async () => {
    try {
        const data = await promises_1.default.readFile(LOG_FILE_PATH, 'utf8');
        return data;
    }
    catch (error) {
        // 文件不存在时返回null
        if (error.code === 'ENOENT') {
            return null;
        }
        console.error('读取日志文件失败:', error);
        throw error;
    }
});
electron_1.ipcMain.handle('write-log-file', async (_, logData) => {
    try {
        await promises_1.default.writeFile(LOG_FILE_PATH, logData, 'utf8');
    }
    catch (error) {
        console.error('写入日志文件失败:', error);
        throw error;
    }
});
// 配置持久化文件路径
const CONFIG_FILE_PATH = path_1.default.join(electron_2.app.getPath('userData'), 'config.json');
// 缩略图缓存路径 - 放在项目目录下的 picTemp 文件夹
const THUMBNAIL_CACHE_PATH = path_1.default.join(__dirname, '..', 'picTemp');
// 确保缩略图缓存目录存在
async function ensureThumbnailCache() {
    try {
        await promises_1.default.access(THUMBNAIL_CACHE_PATH);
    }
    catch {
        await promises_1.default.mkdir(THUMBNAIL_CACHE_PATH, { recursive: true });
    }
}
// 初始化时确保缓存目录存在（不等待）
ensureThumbnailCache().catch((error) => {
    console.error('[Electron Main] Failed to create thumbnail cache directory:', error.message);
});
// 生成缩略图
async function generateThumbnail(imagePath) {
    // 使用文件路径的哈希作为缓存文件名
    const hash = crypto_1.default.createHash('md5').update(imagePath).digest('hex');
    const thumbnailPath = path_1.default.join(THUMBNAIL_CACHE_PATH, `${hash}.webp`);
    try {
        // 检查缓存是否存在且原图未修改
        const [thumbnailExists, imageStats] = await Promise.all([
            promises_1.default
                .access(thumbnailPath)
                .then(() => true)
                .catch(() => false),
            promises_1.default.stat(imagePath),
        ]);
        if (thumbnailExists) {
            const thumbnailStats = await promises_1.default.stat(thumbnailPath);
            // 如果缩略图比原图新，直接使用缓存
            if (thumbnailStats.mtime >= imageStats.mtime) {
                return thumbnailPath;
            }
        }
        // 生成新的缩略图
        await (0, sharp_1.default)(imagePath)
            .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(thumbnailPath);
        return thumbnailPath;
    }
    catch (error) {
        console.error('Error generating thumbnail:', error);
        throw error;
    }
}
electron_1.ipcMain.handle('load-config', async () => {
    try {
        const data = await promises_1.default.readFile(CONFIG_FILE_PATH, 'utf8');
        return JSON.parse(data);
    }
    catch (error) {
        // 文件不存在时返回null
        if (error.code === 'ENOENT') {
            return null;
        }
        console.error('加载配置失败:', error);
        return null;
    }
});
electron_1.ipcMain.handle('save-config', async (_, config) => {
    try {
        await promises_1.default.writeFile(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf8');
    }
    catch (error) {
        console.error('保存配置失败:', error);
        throw error;
    }
});
// 获取图片的 Data URL
// 获取图片的 Data URL
electron_1.ipcMain.handle('get-image-data-url', async (_, imagePath) => {
    try {
        console.log('[Electron Main] Reading image for Data URL:', imagePath);
        const data = await promises_1.default.readFile(imagePath);
        const base64 = data.toString('base64');
        const ext = path_1.default.extname(imagePath).toLowerCase();
        const mimeType = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
        }[ext] || 'image/png';
        const dataUrl = `data:${mimeType};base64,${base64}`;
        console.log('[Electron Main] Generated Data URL for:', imagePath, 'Size:', base64.length);
        return dataUrl;
    }
    catch (error) {
        const err = error;
        console.error('[Electron Main] Error reading image:', imagePath, err.message);
        throw error;
    }
});
// 获取缩略图路径
electron_1.ipcMain.handle('get-thumbnail', async (_, imagePath) => {
    try {
        const thumbnailPath = await generateThumbnail(imagePath);
        return thumbnailPath;
    }
    catch (error) {
        const err = error;
        console.error('[Electron Main] Error getting thumbnail:', imagePath, err.message);
        throw error;
    }
});
// 批量生成缩略图
electron_1.ipcMain.handle('generate-thumbnails', async (_, imagePaths) => {
    try {
        const results = [];
        for (const imagePath of imagePaths) {
            try {
                const thumbnailPath = await generateThumbnail(imagePath);
                results.push({
                    originalPath: imagePath,
                    thumbnailPath,
                    success: true,
                });
            }
            catch (error) {
                const err = error;
                results.push({
                    originalPath: imagePath,
                    error: err.message,
                    success: false,
                });
            }
        }
        return results;
    }
    catch (error) {
        const err = error;
        console.error('[Electron Main] Error generating thumbnails:', err.message);
        throw error;
    }
});
electron_1.app.whenReady().then(async () => {
    // 确保缩略图缓存目录存在
    await ensureThumbnailCache();
    // 注册自定义协议（带安全验证）
    electron_1.protocol.registerFileProtocol('app', (request, callback) => {
        console.log('[Electron Main] App protocol request:', request.url);
        const url = request.url.replace('app://', '');
        const decodedPath = decodeURIComponent(url);
        const resolvedPath = path_1.default.resolve(decodedPath);
        console.log('[Electron Main] Serving file:', resolvedPath);
        // 安全验证：确保请求的文件路径在允许的目录内
        const allowedBasePath = path_1.default.resolve(__dirname, '..', 'picTemp');
        if (!resolvedPath.startsWith(allowedBasePath)) {
            console.error('[Electron Main] Access denied for path:', resolvedPath);
            console.error('[Electron Main] Allowed base path:', allowedBasePath);
            callback({ error: -2 });
            return;
        }
        // 检查文件是否存在
        promises_1.default.access(resolvedPath)
            .then(() => {
            console.log('[Electron Main] File exists, serving:', resolvedPath);
            callback({ path: resolvedPath });
        })
            .catch((error) => {
            const err = error;
            console.error('[Electron Main] File not found:', resolvedPath, err.message);
            callback({ error: -6 });
        });
    });
    createWindow();
    electron_1.app.on('activate', function () {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('window-all-closed', function () {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
