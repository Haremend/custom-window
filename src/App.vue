<template>
  <div id="app" class="explorer-container">
    <!-- Windows 风格工具栏 -->
    <header class="explorer-header">
      <div class="header-toolbar">
        <button @click="addPath" class="toolbar-btn">
          <i class="icon-folder"></i>
          添加路径
        </button>
        <button @click="refresh" class="toolbar-btn">
          <i class="icon-refresh"></i>
          刷新
        </button>
        <button @click="showPathManager = true" class="toolbar-btn">
          <i class="icon-settings"></i>
          管理路径
        </button>
        <button @click="showLogViewer = true" class="toolbar-btn">
          <i class="icon-document"></i>
          查看日志
        </button>

        <div class="path-section">
          <span class="path-label">当前路径:</span>
          <div class="path-display">
            <span v-if="currentPath" class="current-path">{{ currentPath }}</span>
            <span v-else class="no-path">请选择或添加路径</span>
          </div>
        </div>

        <div class="size-control">
          <label class="size-label">图片大小:</label>
          <input
            type="range"
            v-model="imageSize"
            min="200"
            max="1024"
            step="10"
            class="size-slider"
          >
          <span class="size-value">{{ imageSize }}px</span>
        </div>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <main class="explorer-main">
      <!-- 文件夹列表 -->
      <div class="folder-list-container" v-if="showFolderList">
        <div class="list-header">
          <div class="col-name" @click="setSortBy('name')">
            名称
            <span v-if="sortBy === 'name'" class="sort-indicator">
              {{ sortOrder === 'asc' ? '↑' : '↓' }}
            </span>
          </div>
          <div class="col-time" @click="setSortBy('time')">
            修改时间
            <span v-if="sortBy === 'time'" class="sort-indicator">
              {{ sortOrder === 'asc' ? '↑' : '↓' }}
            </span>
          </div>
          <div class="col-count" @click="setSortBy('count')">
            图片数量
            <span v-if="sortBy === 'count'" class="sort-indicator">
              {{ sortOrder === 'asc' ? '↑' : '↓' }}
            </span>
          </div>
        </div>

        <div class="folder-list">
          <div v-if="loading" class="loading-state">
            <div class="spinner"></div>
            <span>加载中...</span>
          </div>

          <div v-else-if="sortedFolders.length === 0" class="empty-state">
            <div class="empty-icon">📁</div>
            <h3>暂无文件夹</h3>
            <p>添加路径开始管理您的图片</p>
          </div>

          <div v-else>
            <div
              v-for="folder in sortedFolders"
              :key="folder.path"
              @click="selectFolder(folder)"
              class="folder-row"
              :class="{ selected: selectedFolder?.path === folder.path }"
            >
              <div class="col-name">
                <div class="folder-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M1.5 2.5h5l1.5 2h6v8a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z" fill="#4285f4"/>
                  </svg>
                </div>
                <span class="folder-name">{{ folder.name }}</span>
              </div>
              <div class="col-time">{{ formatDateTime(folder.lastModified) }}</div>
              <div class="col-count">{{ folder.imageCount }} 张</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 图片列表视图 -->
      <div class="image-list-container" v-if="selectedFolder">
        <div class="image-list-header">
          <div class="header-left">
            <button @click="goBackToFolders" class="back-btn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12l-4-4 4-4" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
              返回上级
            </button>
            <h3>{{ selectedFolder.name }} - 图片列表</h3>
          </div>
          <div class="image-count">{{ allImages.length }} 张图片</div>
        </div>

        <div class="image-list">
          <div v-if="loadingImages" class="loading-state">
            <div class="spinner"></div>
            <span>加载图片中...</span>
          </div>

          <div v-else-if="allImages.length === 0" class="empty-state">
            <div class="empty-icon">🖼️</div>
            <h3>该文件夹暂无图片</h3>
          </div>

          <div v-else>
            <div v-if="isGeneratingThumbnails" class="thumbnail-loading-state">
              <div class="spinner"></div>
              <span>正在生成缩略图...</span>
            </div>

            <div v-else class="image-grid-container">
              <div
                class="image-grid-list"
                :style="{ 'grid-template-columns': `repeat(auto-fill, minmax(${gridMinWidth}px, 1fr))` }"
              >
                <div
                  v-for="image in allImages"
                  :key="image.path"
                  class="image-item"
                  :style="imageContainerStyle"
                  @click="openImageViewer(image)"
                >
                  <div
                    class="image-thumb"
                    :style="imageThumbStyle"
                    :ref="el => { if (el) observeImage(el, image.path) }"
                  >
                    <img
                      v-if="thumbnailUrls[image.path]"
                      :src="thumbnailUrls[image.path]"
                      :alt="image.name"
                      @error="handleImageError(image, $event)"
                      @load="handleImageLoad(image, $event)"
                      decoding="async"
                    />
                    <img
                      v-else-if="imageUrls[image.path]"
                      :src="imageUrls[image.path]"
                      :alt="image.name"
                      @error="handleImageError(image, $event)"
                      @load="handleImageLoad(image, $event)"
                      decoding="async"
                    />
                    <div v-else class="image-loading">
                      <div class="spinner small"></div>
                    </div>
                  </div>
                  <div class="image-info">
                    <div class="image-name">{{ image.name }}</div>
                    <div class="image-meta">
                      {{ formatFileSize(image.size) }} • {{ formatDate(image.lastModified) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 路径管理对话框 -->
    <div v-if="showPathManager" class="modal-overlay" @click="showPathManager = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>管理监控路径</h3>
          <button @click="showPathManager = false" class="btn-close">×</button>
        </div>

        <div class="modal-body">
          <div v-if="watchedPaths.length === 0" class="empty-paths">
            <div class="empty-icon">📁</div>
            <p>暂无监控路径</p>
          </div>

          <div v-else class="path-list">
            <div v-for="path in watchedPaths" :key="path" class="path-item">
              <div class="path-info">
                <div class="path-name">{{ getFolderName(path) }}</div>
                <div class="path-full">{{ path }}</div>
                <div class="path-stats" v-if="getPathStats(path)">
                  <span class="stat-badge">
                    {{ getPathStats(path).subfolders.length }} 个子文件夹
                  </span>
                  <span class="stat-badge">
                    {{ getTotalImagesInPath(path) }} 张图片
                  </span>
                </div>
              </div>
              <button @click="removePath(path)" class="btn-remove">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="showPathManager = false" class="btn btn-secondary">关闭</button>
        </div>
      </div>
    </div>

    <!-- 日志查看对话框 -->
    <div v-if="showLogViewer" class="modal-overlay" @click="showLogViewer = false">
      <div class="modal-content modal-large" @click.stop>
        <div class="modal-header">
          <h3>系统日志</h3>
          <button @click="showLogViewer = false" class="btn-close">×</button>
        </div>
        <div class="modal-body" style="padding: 0; height: 70vh;">
          <LogViewer />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import logger from './utils/logger'
import LogViewer from './components/LogViewer.vue'
import { RecycleScroller, DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

export default {
  components: {
    LogViewer,
    RecycleScroller,
    DynamicScroller,
    DynamicScrollerItem
  },
  data() {
    return {
      watchedPaths: [],
      folderStats: new Map(),
      selectedFolder: null,
      allImages: [],
      loading: false,
      loadingImages: false,
      configLoaded: false,
      showPathManager: false,
      sortBy: 'count',
      sortOrder: 'desc',
      currentPath: '',
      loadedImages: new Set(),
      showFolderList: true,
      showLogViewer: false,
      imageUrls: {}, // 存储图片URL
      thumbnailUrls: {}, // 存储缩略图URL
      visibleImages: [], // 当前可见的图片
      imageLoadQueue: [], // 图片加载队列
      isGeneratingThumbnails: false, // 缩略图生成状态
      imageSize: 200, // 图片容器高度，保持1.25高宽比（高:宽 = 1.25:1）
      // 缓存管理
      maxCacheSize: 1000, // 最大缓存数量
      cacheCleanupInterval: null, // 缓存清理定时器
      // 懒加载
      intersectionObserver: null, // Intersection Observer 实例
      visibleImageSet: new Set(), // 当前可见的图片集合
    }
  },
  computed: {
    sortedFolders() {
      const allFolders = []
      this.folderStats.forEach((stats) => {
        if (stats && stats.subfolders) {
          stats.subfolders.forEach(folder => {
            allFolders.push(folder)
          })
        }
      })

      return allFolders.sort((a, b) => {
        let comparison = 0
        switch (this.sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name)
            break
          case 'time':
            comparison = new Date(a.lastModified) - new Date(b.lastModified)
            break
          case 'count':
            comparison = a.imageCount - b.imageCount
            break
        }
        return this.sortOrder === 'asc' ? comparison : -comparison
      })
    },
    totalImages() {
      return this.sortedFolders.reduce((total, folder) => total + folder.imageCount, 0)
    },

    // 计算图片容器尺寸，保持1.25高宽比（高:宽 = 1.25:1）
    imageContainerStyle() {
      const height = this.imageSize
      const width = height / 1.25  // 高:宽 = 1.25:1，所以宽 = 高/1.25

      // 确保最小宽度和合理的最大宽度
      const finalWidth = Math.max(100, Math.min(width, 400))

      return {
        height: `${height}px`,
        width: `${finalWidth}px`
      }
    },

    // 计算图片显示区域尺寸
    imageThumbStyle() {
      const height = this.imageSize * 0.8 // 图片区域占容器的80%
      return {
        height: `${height}px`
      }
    },

    // 计算网格列的最小宽度（基于图片容器宽度）
    gridMinWidth() {
      const imageWidth = this.imageSize / 1.25 // 根据1.25比例计算宽度
      // 确保最小宽度不会太大，保证至少显示2列
      const minWidth = Math.max(100, Math.min(imageWidth + 20, 250))
      return minWidth
    },

    // 响应式断点计算
    responsiveGridColumns() {
      // 可以根据窗口大小动态调整列数
      const containerWidth = this.$el?.clientWidth || 800
      const minItemWidth = this.gridMinWidth
      const columns = Math.floor(containerWidth / minItemWidth)
      return Math.max(1, Math.min(columns, 8)) // 限制在1-8列之间
    }
  },
  methods: {
    async addPath() {
      logger.info('Starting to add path')
      try {
        if (window.electronAPI) {
          logger.debug('Calling Electron folder selection dialog')
          const folderPath = await window.electronAPI.selectFolder()

          if (folderPath) {
            logger.info('User selected folder:', folderPath)

            if (!this.watchedPaths.includes(folderPath)) {
              this.watchedPaths.push(folderPath)
              this.currentPath = folderPath
              logger.debug('Starting to refresh folder statistics')
              await this.refreshFolderStats(folderPath)
              logger.debug('Starting to save configuration')
              await this.saveConfig()
              logger.info('Path added successfully:', folderPath)
            } else {
              logger.warn('Path already exists:', folderPath)
              alert('该路径已存在')
            }
          } else {
            logger.info('User cancelled folder selection')
          }
        } else {
          logger.error('Electron API not available')
          alert('Electron API not available')
        }
      } catch (error) {
        logger.error('Failed to add path:', error)
        alert('添加路径失败: ' + error.message)
      }
    },

    async refresh() {
      this.loading = true
      try {
        for (const path of this.watchedPaths) {
          await this.refreshFolderStats(path)
        }
        await this.saveConfig()
      } catch (error) {
        console.error('Error refreshing:', error)
        alert('刷新失败: ' + error.message)
      } finally {
        this.loading = false
      }
    },

    async removePath(pathToRemove) {
      try {
        this.watchedPaths = this.watchedPaths.filter(path => path !== pathToRemove)
        this.folderStats.delete(pathToRemove)
        await this.saveConfig()

        if (this.watchedPaths.length > 0) {
          this.currentPath = this.watchedPaths[0]
        } else {
          this.currentPath = ''
        }

        if (this.selectedFolder && this.selectedFolder.path.startsWith(pathToRemove)) {
          this.selectedFolder = null
          this.allImages = []
        }
      } catch (error) {
        console.error('Error removing path:', error)
        alert('移除路径失败: ' + error.message)
      }
    },

    async loadConfig() {
      try {
        console.log('[DEBUG] loadConfig: checking electronAPI')
        if (window.electronAPI) {
          console.log('[DEBUG] loadConfig: calling loadConfig')
          const config = await window.electronAPI.loadConfig()
          console.log('[DEBUG] loadConfig: result:', JSON.stringify(config))
          if (config && config.watchedPaths && config.watchedPaths.length > 0) {
            this.watchedPaths = config.watchedPaths || []
            this.currentPath = this.watchedPaths[0] || ''
            for (const path of this.watchedPaths) {
              await this.refreshFolderStats(path)
            }
          } else {
            // 如果没有配置或配置为空，自动添加测试路径
            logger.info('No config or empty config found, adding default test path')
            this.watchedPaths = ['D:\\Joy\\SDWebImg']
            this.currentPath = this.watchedPaths[0]
            await this.refreshFolderStats(this.currentPath)
          }
        } else {
          console.log('[DEBUG] loadConfig: electronAPI not available')
        }
      } catch (error) {
        console.error('[DEBUG] Error loading config:', error)
      } finally {
        this.configLoaded = true
        console.log('[DEBUG] loadConfig completed')
      }
    },

    async saveConfig() {
      try {
        if (window.electronAPI) {
          const config = {
            watchedPaths: this.watchedPaths,
            lastUpdated: new Date().toISOString()
          }
          await window.electronAPI.saveConfig(config)
        }
      } catch (error) {
        console.error('Error saving config:', error)
      }
    },

    async refreshFolderStats(folderPath) {
      try {
        if (window.electronAPI) {
          const stats = await window.electronAPI.getFolderStats(folderPath)
          if (stats) {
            this.folderStats.set(folderPath, stats)
          }
        }
      } catch (error) {
        logger.error('Error refreshing folder stats:', error, { path: folderPath })
      }
    },

    async selectFolder(folder) {
      logger.info('Selecting folder:', folder.name, folder.path)
      try {
        this.selectedFolder = folder
        this.allImages = []
        this.loadedImages.clear()
        this.showFolderList = false

        if (window.electronAPI) {
          logger.debug('Starting to load images from folder')
          this.loadingImages = true

          const startTime = Date.now()
          const images = await window.electronAPI.getImagesInFolder(folder.path)
          const loadTime = Date.now() - startTime

          this.allImages = images || []

          logger.info(`Image loading completed: ${images.length} images loaded in ${loadTime}ms`)

          // 为图片处理缩略图（使用懒加载）
          if (images.length > 0) {
            // 只加载已存在的缩略图，缺失的会在滚动到时生成
            await this.loadExistingThumbnails(images)
          }

          if (images.length === 0) {
            logger.warn('No image files found in folder:', folder.path)
          }
        } else {
          logger.error('Electron API not available, cannot load images')
        }
      } catch (error) {
        logger.error('Failed to select folder:', error, { folder: folder.path })
        alert('加载文件夹失败: ' + error.message)
      } finally {
        this.loadingImages = false
      }
    },

    goBackToFolders() {
      this.showFolderList = true
      this.selectedFolder = null
      this.allImages = []
    },

    setSortBy(sortType) {
      if (this.sortBy === sortType) {
        this.toggleSortOrder()
      } else {
        this.sortBy = sortType
        this.sortOrder = 'desc'
      }
    },

    toggleSortOrder() {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc'
    },

    async getImageUrl(imagePath) {
      if (!imagePath) {
        logger.warn('Attempting to get image URL for empty path')
        return ''
      }

      if (window.electronAPI && window.electronAPI.getImageDataUrl) {
        try {
          const dataUrl = await window.electronAPI.getImageDataUrl(imagePath)
          return dataUrl
        } catch (error) {
          logger.error('Failed to generate image Data URL:', error.message, { path: imagePath })
          return ''
        }
      }

      logger.debug('Using original path as URL (non-Electron environment):', imagePath)
      return imagePath
    },

    getFileName(path) {
      return path?.split(/[\\/]/).pop() || ''
    },

    getFolderName(path) {
      return this.getFileName(path)
    },

    getPathStats(path) {
      return this.folderStats.get(path)
    },

    getTotalImagesInPath(path) {
      const stats = this.getPathStats(path)
      if (!stats) return 0
      return stats.subfolders.reduce((total, folder) => total + folder.imageCount, 0)
    },

    formatDate(date) {
      return new Date(date).toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric'
      })
    },

    formatDateTime(date) {
      return new Date(date).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },

    formatFileSize(bytes) {
      if (!bytes) return '未知大小'
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(1024))
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
    },

    openImageViewer(image) {
      const img = new Image()
      img.src = this.getImageUrl(image.path)
      img.onload = () => {
        const newWindow = window.open('', '_blank')
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head>
                <title>${image.name}</title>
                <style>
                  body { margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#f5f5f5; }
                  img { max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15); }
                </style>
              </head>
              <body>
                <img src="${this.getImageUrl(image.path)}" />
              </body>
            </html>
          `)
          newWindow.document.close()
        }
      }
    },

    handleImageLoad(image, event) {
      logger.debug('Image loaded successfully:', {
        name: image.name,
        path: image.path
      })
    },

    handleImageError(image, event) {
      const errorMsg = event.target.error?.message || 'Unknown error'
      logger.error('Failed to load image:', {
        name: image.name,
        path: image.path,
        error: errorMsg
      })

      // 如果缩略图加载失败，尝试使用原始图片
      if (this.thumbnailUrls[image.path] && this.thumbnailUrls[image.path].startsWith('app://')) {
        logger.info('Thumbnail failed, trying original image for:', image.name)
        this.loadOriginalImage(image.path)
      }
    },

    async generateThumbnails(images) {
      logger.info('Starting thumbnail generation for', images.length, 'images')
      this.isGeneratingThumbnails = true

      try {
        // 过滤出还没有缩略图的图片
        const imagesNeedingThumbnails = images.filter(img => !this.thumbnailUrls[img.path])

        if (imagesNeedingThumbnails.length === 0) {
          logger.info('All images already have thumbnails cached')
          this.isGeneratingThumbnails = false
          return
        }

        logger.info(`Need to generate thumbnails for ${imagesNeedingThumbnails.length} images`)

        // 分批处理缩略图生成，避免一次性处理太多图片
        const batchSize = 20
        for (let i = 0; i < imagesNeedingThumbnails.length; i += batchSize) {
          const batch = imagesNeedingThumbnails.slice(i, i + batchSize)
          const imagePaths = batch.map(img => img.path)

          try {
            const results = await window.electronAPI.generateThumbnails(imagePaths)

            // 处理结果
            for (const result of results) {
              if (result.success) {
                // 使用 app:// 协议访问本地文件
                this.thumbnailUrls[result.originalPath] = `app://${result.thumbnailPath}`
              } else {
                logger.error('Failed to generate thumbnail:', result.error, { path: result.originalPath })
                // 失败时立即加载原始图片的 Data URL
                this.loadOriginalImage(result.originalPath)
              }
            }
          } catch (error) {
            logger.error('Error generating thumbnail batch:', error.message)
            // 出错时加载原始图片
            for (const img of batch) {
              this.loadOriginalImage(img.path)
            }
          }

          // 给 UI 一点更新时间
          await new Promise(resolve => setTimeout(resolve, 10))
        }

        logger.info('Thumbnail generation completed')
      } catch (error) {
        logger.error('Error in thumbnail generation:', error.message)
      } finally {
        this.isGeneratingThumbnails = false
      }
    },

    async loadOriginalImage(imagePath) {
      // 直接加载原始图片的 Data URL 作为回退
      try {
        const dataUrl = await this.getImageUrl(imagePath)
        if (dataUrl) {
          this.thumbnailUrls[imagePath] = dataUrl
        } else {
          // 使用占位图
          this.thumbnailUrls[imagePath] = this.getPlaceholderImage()
        }
      } catch (error) {
        logger.error('Failed to load original image:', error.message, { path: imagePath })
        // 使用占位图
        this.thumbnailUrls[imagePath] = this.getPlaceholderImage()
      }
    },

    getPlaceholderImage() {
      // 返回一个简单的 SVG 占位图
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWbvueJh+WkqeivlTwvdGV4dD48L3N2Zz4='
    },

    async loadExistingThumbnails(images) {
      // 检查哪些图片已经有缩略图缓存
      for (const image of images) {
        try {
          const thumbnailPath = await window.electronAPI.getThumbnail(image.path)
          this.thumbnailUrls[image.path] = `app://${thumbnailPath}`
        } catch (error) {
          // 缩略图不存在，后续会生成
        }
      }
    },

    async preloadImageUrls(images) {
      // Preload URLs for all images (fallback for original images)
      for (const image of images) {
        try {
          const dataUrl = await this.getImageUrl(image.path)
          if (dataUrl) {
            this.imageUrls[image.path] = dataUrl
          }
        } catch (error) {
          logger.error('Failed to preload image URL:', error.message, { image: image.name })
        }
      }
    },

    // 缓存清理方法
    cleanupCache() {
      // 清理 thumbnailUrls 缓存
      if (Object.keys(this.thumbnailUrls).length > this.maxCacheSize) {
        logger.info('Cleaning up thumbnail cache...')
        const entries = Object.entries(this.thumbnailUrls)
        const toRemove = entries.slice(0, entries.length - this.maxCacheSize)
        toRemove.forEach(([path]) => {
          delete this.thumbnailUrls[path]
        })
        logger.info(`Cleaned up ${toRemove.length} thumbnail cache entries`)
      }

      // 清理 imageUrls 缓存
      if (Object.keys(this.imageUrls).length > this.maxCacheSize) {
        logger.info('Cleaning up image cache...')
        const entries = Object.entries(this.imageUrls)
        const toRemove = entries.slice(0, entries.length - this.maxCacheSize)
        toRemove.forEach(([path]) => {
          delete this.imageUrls[path]
        })
        logger.info(`Cleaned up ${toRemove.length} image cache entries`)
      }
    },

    // 启动缓存清理定时器
    startCacheCleanup() {
      if (this.cacheCleanupInterval) {
        clearInterval(this.cacheCleanupInterval)
      }
      this.cacheCleanupInterval = setInterval(() => {
        this.cleanupCache()
      }, 300000) // 5分钟清理一次
    },

    // 停止缓存清理定时器
    stopCacheCleanup() {
      if (this.cacheCleanupInterval) {
        clearInterval(this.cacheCleanupInterval)
        this.cacheCleanupInterval = null
      }
    },

    // 初始化 Intersection Observer
    initIntersectionObserver() {
      if (this.intersectionObserver) {
        this.intersectionObserver.disconnect()
      }

      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            const imagePath = entry.target.dataset.imagePath
            if (entry.isIntersecting) {
              if (imagePath && !this.visibleImageSet.has(imagePath)) {
                this.visibleImageSet.add(imagePath)
                this.preloadImageIfNeeded(imagePath)
              }
            } else {
              if (imagePath) {
                this.visibleImageSet.delete(imagePath)
              }
            }
          })
        },
        {
          rootMargin: '100px', // 提前100px开始加载
          threshold: 0.1
        }
      )
    },

    // 观察图片元素
    observeImage(element, imagePath) {
      if (element && this.intersectionObserver && imagePath) {
        element.dataset.imagePath = imagePath
        this.intersectionObserver.observe(element)
      }
    },

    // 预加载图片
    async preloadImageIfNeeded(imagePath) {
      if (this.thumbnailUrls[imagePath] || this.imageUrls[imagePath]) {
        return // 已经加载过了
      }

      try {
        // 优先尝试加载缩略图
        const thumbnailPath = await window.electronAPI.getThumbnail(imagePath)
        if (thumbnailPath) {
          this.thumbnailUrls[imagePath] = `app://${thumbnailPath}`
        }
      } catch (error) {
        logger.warn('Failed to get thumbnail, loading original:', error.message)
        // 失败时加载原始图片
        this.loadOriginalImage(imagePath)
      }
    },

    // 停止观察
    stopObserving() {
      if (this.intersectionObserver) {
        this.intersectionObserver.disconnect()
        this.intersectionObserver = null
      }
      this.visibleImageSet.clear()
    }
  },
  async mounted() {
    logger.info('App component mounting started')
    logger.info('Electron API available:', !!window.electronAPI)

    // 启动缓存清理定时器
    this.startCacheCleanup()
    // 初始化 Intersection Observer
    this.initIntersectionObserver()

    try {
      await this.loadConfig()
      logger.info('Configuration loading completed')
    } catch (error) {
      logger.error('Failed to load configuration:', error)
    }
  },

  beforeUnmount() {
    // 清理定时器
    this.stopCacheCleanup()
    // 停止观察
    this.stopObserving()
  }
}
</script>

<style scoped>
.explorer-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: 'Segoe UI', 'Microsoft YaHei', Arial, sans-serif;
  background: #ffffff;
  color: #333333;
}

.explorer-header {
  background: #f8f9fa;
  border-bottom: 1px solid #e1e5e9;
  padding: 0;
}

.header-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  border-bottom: 1px solid #e1e5e9;
  flex-wrap: wrap;
}

.toolbar-btn {
  padding: 6px 12px;
  background: #ffffff;
  border: 1px solid #d1d9e0;
  border-radius: 3px;
  font-size: 12px;
  color: #333333;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s ease;
}

.toolbar-btn:hover {
  background: #e3f2fd;
  border-color: #2196f3;
}

.size-control {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 16px;
  padding: 4px 12px;
  background: #f5f5f5;
  border-radius: 4px;
  border: 1px solid #e1e5e9;
}

.size-label {
  font-size: 12px;
  color: #666666;
  white-space: nowrap;
}

.size-slider {
  width: 100px;
  height: 4px;
  outline: none;
  border-radius: 2px;
  background: #e1e5e9;
  -webkit-appearance: none;
}

.size-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #2196f3;
  cursor: pointer;
}

.size-value {
  font-size: 11px;
  color: #333333;
  min-width: 40px;
  text-align: right;
}

.path-section {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  padding-left: 16px;
}

.path-label {
  font-size: 13px;
  color: #666666;
  font-weight: 500;
  white-space: nowrap;
}

.path-display {
  font-size: 13px;
  color: #333333;
  padding: 4px 8px;
  background: #f5f5f5;
  border: 1px solid #e1e5e9;
  border-radius: 3px;
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.current-path {
  font-family: 'Consolas', 'Courier New', monospace;
}

.no-path {
  color: #999999;
  font-style: italic;
}

.explorer-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.folder-list-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-right: 1px solid #e1e5e9;
}

.list-header {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: #f8f9fa;
  border-bottom: 2px solid #2196f3;
  font-size: 12px;
  font-weight: 600;
  color: #333333;
  cursor: pointer;
  user-select: none;
}

.list-header > div {
  display: flex;
  align-items: center;
  gap: 4px;
}

.list-header > div:hover {
  background: #e3f2fd;
}

.col-name {
  flex: 2;
  min-width: 200px;
}

.col-time {
  flex: 1;
  min-width: 150px;
}

.col-count {
  flex: 0 0 100px;
  text-align: right;
}

.sort-indicator {
  color: #2196f3;
  font-weight: bold;
}

.folder-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #666666;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e1e5e9;
  border-top: 3px solid #2196f3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #666666;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 500;
  color: #333333;
}

.empty-state p {
  margin: 0;
  font-size: 13px;
  color: #666666;
}

.folder-row {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: 40px;
}

.folder-row:hover {
  background: #f5f5f5;
}

.folder-row.selected {
  background: #e3f2fd;
  border-left: 3px solid #2196f3;
}

.folder-icon {
  margin-right: 8px;
  display: flex;
  align-items: center;
}

.folder-name {
  font-size: 13px;
  color: #333333;
  font-weight: 500;
}

.image-list-container {
  flex: 2;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  overflow: hidden;
}

.image-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e1e5e9;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #ffffff;
  border: 1px solid #d1d9e0;
  border-radius: 3px;
  font-size: 12px;
  color: #333333;
  cursor: pointer;
  transition: all 0.15s ease;
}

.back-btn:hover {
  background: #e3f2fd;
  border-color: #2196f3;
  color: #2196f3;
}

.image-list-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333333;
}

.image-count {
  font-size: 12px;
  color: #666666;
  background: #e1e5e9;
  padding: 2px 8px;
  border-radius: 10px;
}

.image-list {
  flex: 1;
  overflow-y: auto; /* 改为显示垂直滚动条 */
  padding: 16px;
  position: relative;
  height: calc(100vh - 120px); /* 固定高度，留出头部空间 */
}

.thumbnail-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #666666;
  height: 300px;
}

.image-grid-container {
  height: 100%;
  width: 100%;
  overflow: hidden; /* 隐藏容器滚动，使用虚拟滚动 */
}

.image-scroller {
  height: 100%;
  width: 100%;
}

/* 虚拟滚动容器样式 */
.image-scroller {
  padding: 8px;
  width: 100%;
}

/* 虚拟滚动项包装器 */
.image-scroller :deep(.vue-recycle-scroller__item-wrapper) {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(v-bind(gridMinWidth + 'px'), 1fr));
  gap: 16px;
  width: 100%;
  padding: 0 8px;
}

/* 虚拟滚动项视图 */
.image-scroller :deep(.vue-recycle-scroller__item-view) {
  width: 100%;
}

.image-grid-list {
  display: grid;
  gap: 16px;
  padding: 8px;
  align-items: start; /* 确保项目从顶部开始对齐 */
}

.image-item {
  background: #ffffff;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  /* 确保项目不会超出容器 */
  max-width: 100%;
  box-sizing: border-box;
}

.image-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: #2196f3;
}

.image-thumb {
  overflow: hidden;
  background: #f5f5f5;
  position: relative;
  width: 100%;
}

.image-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.image-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
}

.spinner.small {
  width: 20px;
  height: 20px;
  border: 2px solid #e1e5e9;
  border-top: 2px solid #2196f3;
  margin-bottom: 0;
}

.image-item:hover .image-thumb img {
  transform: scale(1.05);
}

.image-info {
  padding: 8px 12px;
}

.image-name {
  font-size: 12px;
  font-weight: 500;
  color: #333333;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-meta {
  font-size: 11px;
  color: #666666;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  width: 600px;
  max-width: 90vw;
  max-height: 80vh;
  overflow: hidden;
  animation: slideIn 0.3s ease;
}

.modal-large {
  width: 90vw;
  max-width: 1200px;
  height: 85vh;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e1e5e9;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333333;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #666666;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.btn-close:hover {
  background: #e1e5e9;
  color: #333333;
}

.modal-body {
  padding: 20px;
  max-height: 50vh;
  overflow-y: auto;
}

.empty-paths {
  text-align: center;
  padding: 40px 20px;
  color: #666666;
}

.path-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.path-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.path-item:hover {
  background: #f0f0f0;
  border-color: #d1d9e0;
}

.path-info {
  flex: 1;
  margin-right: 12px;
}

.path-name {
  font-size: 14px;
  font-weight: 500;
  color: #333333;
  margin-bottom: 4px;
}

.path-full {
  font-size: 12px;
  color: #666666;
  font-family: 'Consolas', 'Courier New', monospace;
  margin-bottom: 6px;
}

.path-stats {
  display: flex;
  gap: 8px;
}

.stat-badge {
  font-size: 11px;
  color: #666666;
  background: #e1e5e9;
  padding: 2px 6px;
  border-radius: 10px;
}

.btn-remove {
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-remove:hover {
  background: #ffe6e6;
  color: #c82333;
}

.modal-footer {
  padding: 16px 20px;
  background: #f8f9fa;
  border-top: 1px solid #e1e5e9;
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;
}

.btn-secondary {
  background: #ffffff;
  border-color: #d1d9e0;
  color: #333333;
}

.btn-secondary:hover {
  background: #f5f5f5;
  border-color: #b0b0b0;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

@media (max-width: 768px) {
  .explorer-main {
    flex-direction: column;
  }

  .folder-list-container {
    border-right: none;
    border-bottom: 1px solid #e1e5e9;
  }

  .image-grid-list {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
  }

  .modal-content {
    width: 95vw;
    margin: 10px;
  }

  .list-header {
    padding: 8px 12px;
  }

  .folder-row {
    padding: 8px 12px;
  }

  .col-name {
    min-width: 150px;
  }

  .col-time {
    min-width: 120px;
  }
}

@media (max-width: 480px) {
  .header-toolbar {
    padding: 8px 12px;
    gap: 6px;
  }

  .toolbar-btn {
    padding: 4px 8px;
    font-size: 11px;
  }

  .path-bar {
    padding: 6px 12px;
  }

  .sort-bar {
    padding: 6px 12px;
  }

  .image-grid-list {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 8px;
  }

  .col-time {
    display: none;
  }
}
</style>