<template>
  <div id="app" class="app-container" :style="backgroundStyle">
    <!-- 顶部导航栏 -->
    <header class="app-header">
      <div class="header-left">
        <div class="app-logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#4F46E5"/>
            <path d="M8 12h16v8H8z" fill="white" fill-opacity="0.9"/>
            <circle cx="12" cy="14" r="2" fill="#4F46E5"/>
            <circle cx="20" cy="14" r="2" fill="#4F46E5"/>
          </svg>
          <h1 class="app-title">图片管理器</h1>
        </div>
      </div>

      <div class="header-center">
        <div class="stats-info">
          <span class="stats-item">
            <i class="icon-folder"></i>
            {{ watchedPaths.length }} 个路径
          </span>
          <span class="stats-item">
            <i class="icon-image"></i>
            {{ totalImages }} 张图片
          </span>
          <span v-if="!configLoaded" class="loading-text">加载中...</span>
        </div>
      </div>

      <div class="header-right">
        <button @click="showBackgroundManager = true" class="btn btn-secondary">
          <i class="icon-image"></i>
          背景设置
        </button>
        <button @click="showPathManager = true" class="btn btn-secondary">
          <i class="icon-settings"></i>
          管理路径
        </button>
        <button @click="addPath" class="btn btn-primary">
          <i class="icon-plus"></i>
          添加路径
        </button>
        <button @click="refresh" class="btn btn-secondary">
          <i class="icon-refresh"></i>
          刷新
        </button>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <main class="app-main">
      <!-- 侧边栏 -->
      <aside class="app-sidebar">
        <div class="sidebar-header">
          <h2>文件夹</h2>
          <span class="folder-count">{{ sortedFolders.length }}</span>
        </div>

        <div class="sidebar-content">
          <div v-if="loading" class="loading-state">
            <div class="spinner"></div>
            <span>加载中...</span>
          </div>

          <div v-else-if="sortedFolders.length === 0" class="empty-state">
            <div class="empty-icon">📁</div>
            <h3>暂无文件夹</h3>
            <p>添加路径开始管理您的图片</p>
          </div>

          <div v-else class="folder-list">
            <div
              v-for="folder in sortedFolders"
              :key="folder.path"
              @click="selectFolder(folder)"
              class="folder-item"
              :class="{ active: selectedFolder?.path === folder.path }"
            >
              <div class="folder-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M2 5.5h6l2 3h7v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2z" fill="currentColor"/>
                </svg>
              </div>
              <div class="folder-info">
                <div class="folder-name">{{ folder.name }}</div>
                <div class="folder-meta">
                  <span class="image-count">{{ folder.imageCount }} 张图片</span>
                  <span class="folder-date">{{ formatDate(folder.lastModified) }}</span>
                </div>
              </div>
              <div class="folder-arrow">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 12l4-4-4-4" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- 主内容区 -->
      <section class="app-content">
        <!-- 图片预览区 -->
        <div class="preview-section">
          <div class="preview-header">
            <div class="preview-info" v-if="selectedFolder">
              <h3>{{ selectedFolder.name }}</h3>
              <p>{{ selectedImage ? getFileName(selectedImage.path) : '请选择图片' }}</p>
            </div>

            <div class="preview-controls" v-if="currentImages.length > 0">
              <button @click="previousImage" :disabled="!hasPrevious" class="btn-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M12 15l-6-6 6-6" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
              </button>
              <span class="image-counter">{{ currentImageIndex + 1 }} / {{ currentImages.length }}</span>
              <button @click="nextImage" :disabled="!hasNext" class="btn-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M8 15l6-6-6-6" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="preview-area">
            <div v-if="selectedImage" class="image-preview">
              <img
                :src="getImageUrl(selectedImage.path)"
                :alt="selectedImage.name"
                @click="openFullscreen"
                class="preview-image"
              />
            </div>
            <div v-else class="no-preview">
              <div class="no-preview-icon">🖼️</div>
              <h3>选择图片预览</h3>
              <p>点击下方缩略图查看图片</p>
            </div>
          </div>
        </div>

        <!-- 图片网格 -->
        <div class="image-grid-section" v-if="allImages.length > 0">
          <div class="grid-header">
            <h4>图片缩略图</h4>
            <div class="grid-info">
              共 {{ allImages.length }} 张图片
            </div>
          </div>

          <div class="image-grid">
            <div
              v-for="image in currentImages"
              :key="image.path"
              @click="selectImage(image)"
              class="image-thumbnail"
              :class="{ selected: selectedImage?.path === image.path }"
            >
              <img :src="getImageUrl(image.path)" :alt="image.name" />
              <div class="image-name">{{ image.name }}</div>
            </div>

          </div>
        </div>
      </section>
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

    <!-- 背景图片管理对话框 -->
    <div v-if="showBackgroundManager" class="modal-overlay" @click="showBackgroundManager = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>背景图片设置</h3>
          <button @click="showBackgroundManager = false" class="btn-close">×</button>
        </div>

        <div class="modal-body">
          <div class="background-controls">
            <div class="control-group">
              <label>背景透明度</label>
              <input
                type="range"
                v-model="backgroundOpacity"
                min="0"
                max="1"
                step="0.1"
                @change="saveConfig"
              >
              <span class="opacity-value">{{ Math.round(backgroundOpacity * 100) }}%</span>
            </div>

            <div class="control-group" v-if="backgroundImage">
              <label>当前背景</label>
              <div class="current-background">
                <img :src="backgroundImage" alt="当前背景" class="background-preview">
                <button @click="removeBackgroundImage" class="btn-remove-background">
                  移除背景
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="setBackgroundImage" class="btn btn-primary">选择新背景</button>
          <button @click="showBackgroundManager = false" class="btn btn-secondary">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      watchedPaths: [],
      folderStats: new Map(),
      selectedFolder: null,
      allImages: [],
      currentImages: [],
      selectedImage: null,
      loading: false,
      loadingImages: false,
      currentPage: 0,
      pageSize: 20,
      hasMoreImages: false,
      configLoaded: false,
      showPathManager: false,
      showBackgroundManager: false,
      backgroundImage: null, // 背景图片
      backgroundOpacity: 0.3, // 背景图片透明度
      loadedImages: new Set() // 跟踪已加载的图片
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
      return allFolders.sort((a, b) => b.imageCount - a.imageCount)
    },
    totalImages() {
      return this.sortedFolders.reduce((total, folder) => total + folder.imageCount, 0)
    },
    currentImageIndex() {
      if (!this.selectedImage) return -1
      return this.currentImages.findIndex(img => img.path === this.selectedImage.path)
    },
    hasPrevious() {
      return this.currentImageIndex > 0
    },
    hasNext() {
      return this.currentImageIndex < this.currentImages.length - 1
    },
    // 背景样式
    backgroundStyle() {
      const baseGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'

      if (this.backgroundImage) {
        return {
          background: `
            ${baseGradient},
            url(${this.backgroundImage}) center/cover
          `,
          backgroundBlendMode: 'overlay'
        }
      }

      return {
        background: baseGradient
      }
    }
  },
  methods: {
    async addPath() {
      try {
        if (window.electronAPI) {
          const folderPath = await window.electronAPI.selectFolder()
          if (folderPath) {
            if (!this.watchedPaths.includes(folderPath)) {
              this.watchedPaths.push(folderPath)
              await this.refreshFolderStats(folderPath)
              await this.saveConfig()
            } else {
              alert('该路径已存在')
            }
          }
        } else {
          alert('Electron API not available')
        }
      } catch (error) {
        console.error('Error adding path:', error)
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

    // 移除路径
    async removePath(pathToRemove) {
      try {
        this.watchedPaths = this.watchedPaths.filter(path => path !== pathToRemove)
        this.folderStats.delete(pathToRemove)
        await this.saveConfig()

        // 如果移除的是当前选中的文件夹，清除选择
        if (this.selectedFolder && this.selectedFolder.path.startsWith(pathToRemove)) {
          this.selectedFolder = null
          this.allImages = []
          this.currentImages = []
          this.selectedImage = null
        }
      } catch (error) {
        console.error('Error removing path:', error)
        alert('移除路径失败: ' + error.message)
      }
    },

    // 加载配置
    async loadConfig() {
      try {
        if (window.electronAPI) {
          const config = await window.electronAPI.loadConfig()
          if (config) {
            this.watchedPaths = config.watchedPaths || []
            this.backgroundImage = config.backgroundImage || null
            this.backgroundOpacity = config.backgroundOpacity || 0.1
            // 自动加载所有已保存的路径
            for (const path of this.watchedPaths) {
              await this.refreshFolderStats(path)
            }
          }
        }
      } catch (error) {
        console.error('Error loading config:', error)
      } finally {
        this.configLoaded = true
      }
    },

    // 保存配置
    async saveConfig() {
      try {
        if (window.electronAPI) {
          const config = {
            watchedPaths: this.watchedPaths,
            backgroundImage: this.backgroundImage,
            backgroundOpacity: this.backgroundOpacity,
            lastUpdated: new Date().toISOString()
          }
          await window.electronAPI.saveConfig(config)
        }
      } catch (error) {
        console.error('Error saving config:', error)
      }
    },

    // 设置背景图片
    async setBackgroundImage() {
      try {
        if (window.electronAPI) {
          const imagePath = await window.electronAPI.selectImage()
          if (imagePath) {
            this.backgroundImage = `local:///${imagePath.replace(/\\/g, '/')}`
            await this.saveConfig()
          }
        }
      } catch (error) {
        console.error('Error setting background image:', error)
        alert('设置背景图片失败: ' + error.message)
      }
    },

    // 移除背景图片
    async removeBackgroundImage() {
      this.backgroundImage = null
      await this.saveConfig()
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
        console.error('Error refreshing folder stats:', error)
      }
    },

    async selectFolder(folder) {
      try {
        this.selectedFolder = folder
        this.selectedImage = null
        this.allImages = []
        this.currentImages = []
        this.loadedImages.clear()
        this.currentPage = 0
        this.hasMoreImages = false

        if (window.electronAPI) {
          this.loadingImages = true
          const images = await window.electronAPI.getImagesInFolder(folder.path)
          this.allImages = images || []

          // 一次性加载所有缩略图
          this.loadAllThumbnails()

          if (this.currentImages.length > 0) {
            this.selectedImage = this.currentImages[0]
            // 预加载第一张图片
            this.loadImageLazy(this.currentImages[0])
          }
        }
      } catch (error) {
        console.error('Error selecting folder:', error)
        alert('加载文件夹失败: ' + error.message)
      } finally {
        this.loadingImages = false
      }
    },

    selectImage(image) {
      this.selectedImage = image
      // 懒加载选中的图片
      this.loadImageLazy(image)

      // 预加载相邻的图片
      const currentIndex = this.allImages.findIndex(img => img.path === image.path)
      if (currentIndex > 0) {
        this.loadImageLazy(this.allImages[currentIndex - 1])
      }
      if (currentIndex < this.allImages.length - 1) {
        this.loadImageLazy(this.allImages[currentIndex + 1])
      }
    },

    previousImage() {
      if (this.hasPrevious) {
        const prevIndex = this.currentImageIndex - 1
        this.selectedImage = this.currentImages[prevIndex]
        // 懒加载上一张图片
        this.loadImageLazy(this.selectedImage)
      }
    },

    nextImage() {
      if (this.hasNext) {
        const nextIndex = this.currentImageIndex + 1
        this.selectedImage = this.currentImages[nextIndex]
        // 懒加载下一张图片
        this.loadImageLazy(this.selectedImage)
      }
    },

    loadAllThumbnails() {
      // 一次性加载所有缩略图
      this.currentImages = [...this.allImages]
      this.hasMoreImages = false
      this.currentPage = 1
    },

    loadImageLazy(image) {
      // 懒加载单张图片
      if (image && !this.loadedImages.has(image.path)) {
        this.loadedImages.add(image.path)
        const img = new Image()
        img.src = this.getImageUrl(image.path)
      }
    },

    loadMoreImages() {
      // 保留这个方法来保持兼容性
      return
    },

    getImageUrl(imagePath) {
      if (!imagePath) return ''
      if (window.electronAPI) {
        const cleanPath = imagePath.replace(/\\/g, '/')
        return `local:///${cleanPath}`
      }
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

    openFullscreen() {
      if (this.selectedImage) {
        const img = new Image()
        img.src = this.getImageUrl(this.selectedImage.path)
        img.onload = () => {
          const newWindow = window.open('', '_blank')
          if (newWindow) {
            newWindow.document.write(`
              <html>
                <head><title>${this.selectedImage.name}</title></head>
                <body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#000;">
                  <img src="${this.getImageUrl(this.selectedImage.path)}" style="max-width:100%;max-height:100%;object-fit:contain;" />
                </body>
              </html>
            `)
            newWindow.document.close()
          }
        }
      }
    }
  },
  async mounted() {
    console.log('App mounted, Electron API available:', !!window.electronAPI)
    // 启动时自动加载配置
    await this.loadConfig()
  }
}
</script>

<style scoped>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: 'SF Pro Display', 'Segoe UI', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  background: #0F1419;
  color: #FFFFFF;
}

/* CSS Variables for theming */
.app-container {
  --bg-primary: #0F1419;
  --bg-secondary: #1E2328;
  --bg-tertiary: #2D3748;
  --bg-card: rgba(30, 35, 40, 0.8);
  --accent-primary: #00D4FF;
  --accent-secondary: #0EA5E9;
  --text-primary: #FFFFFF;
  --text-secondary: #E5E7EB;
  --text-muted: #9CA3AF;
  --border-color: #374151;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
}

/* 顶部导航 */
.app-header {
  height: 44px;
  background: var(--bg-card);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  padding: 0 16px;
  box-shadow: var(--shadow-md);
  position: relative;
  z-index: 10;
}

.header-left {
  flex: 0 0 auto;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  letter-spacing: -0.025em;
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.stats-info {
  display: flex;
  gap: 16px;
}

.stats-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 500;
}

.header-right {
  flex: 0 0 auto;
  display: flex;
  gap: 8px;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: var(--bg-primary);
  font-weight: 600;
}

.btn-primary:hover {
  background: linear-gradient(135deg, var(--accent-secondary), var(--accent-primary));
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--border-color);
  color: var(--text-primary);
  border-color: var(--accent-primary);
}

/* 主内容区 */
.app-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 侧边栏 */
.app-sidebar {
  width: 260px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.025em;
}

.folder-count {
  background: var(--bg-tertiary);
  color: var(--text-muted);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: 10px;
  font-weight: 600;
  border: 1px solid var(--border-color);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
}

.loading-state {
  padding: 40px;
  text-align: center;
  color: #64748b;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e2e8f0;
  border-top: 2px solid #4f46e5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  padding: 40px 24px;
  text-align: center;
  color: #64748b;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  color: #1e293b;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.folder-list {
  padding: 8px 0;
}

.folder-item {
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border-left: 2px solid transparent;
  border-radius: var(--radius-sm);
  margin: 0 8px;
}

.folder-item:hover {
  background: var(--bg-tertiary);
  transform: translateX(2px);
}

.folder-item.active {
  background: rgba(0, 212, 255, 0.1);
  border-left-color: var(--accent-primary);
  box-shadow: inset 0 0 0 1px rgba(0, 212, 255, 0.2);
}

.folder-icon {
  color: var(--accent-primary);
  opacity: 0.8;
  transition: all 0.2s;
}

.folder-item:hover .folder-icon {
  opacity: 1;
  transform: scale(1.1);
}

.folder-info {
  flex: 1;
  min-width: 0;
}

.folder-name {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: var(--text-muted);
}

.folder-arrow {
  color: #cbd5e1;
  opacity: 0;
  transition: opacity 0.2s;
}

.folder-item:hover .folder-arrow {
  opacity: 1;
}

/* 主内容区 */
.app-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-section {
  flex: 1;
  background: var(--bg-card);
  backdrop-filter: blur(10px);
  margin: 8px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.preview-header {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-info h3 {
  margin: 0 0 2px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.025em;
}

.preview-info p {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
}

.preview-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-icon {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-icon:hover:not(:disabled) {
  background: var(--accent-primary);
  color: var(--bg-primary);
  border-color: var(--accent-primary);
  transform: translateY(-1px);
}

.btn-icon:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  background: var(--bg-tertiary);
}

.image-counter {
  font-size: 12px;
  color: var(--text-muted);
  min-width: 50px;
  text-align: center;
  font-weight: 500;
}

.preview-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.image-preview {
  max-width: 100%;
  max-height: 100%;
  text-align: center;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--border-color);
}

.preview-image:hover {
  transform: scale(1.02);
  box-shadow: var(--shadow-lg), 0 0 0 2px var(--accent-primary);
}

.no-preview {
  text-align: center;
  color: var(--text-muted);
}

.no-preview-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.no-preview h3 {
  margin: 0 0 6px 0;
  color: var(--text-primary);
  font-size: 14px;
}

.no-preview p {
  margin: 0;
  font-size: 12px;
}

/* 图片网格 */
.image-grid-section {
  background: var(--bg-card);
  backdrop-filter: blur(10px);
  margin: 0 8px 8px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  max-height: 160px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
}

.grid-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.grid-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.025em;
}

.grid-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
}

.btn-load-more {
  padding: 2px 8px;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 10px;
  cursor: pointer;
}

.btn-load-more:hover {
  background: #4338ca;
}

.image-grid {
  flex: 1;
  overflow-x: auto;
  padding: 12px 16px;
  display: flex;
  gap: 8px;
}

.image-thumbnail {
  flex: 0 0 auto;
  width: 70px;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  overflow: hidden;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--bg-tertiary);
}

.image-thumbnail:hover {
  border-color: var(--accent-primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.image-thumbnail.selected {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2);
}

.image-thumbnail img {
  width: 100%;
  height: 50px;
  object-fit: cover;
  background: var(--bg-tertiary);
  transition: all 0.2s;
}

.image-thumbnail img[src] {
  opacity: 1;
}

.image-thumbnail img:not([src]) {
  opacity: 0.3;
}

.image-name {
  padding: 2px;
  font-size: 10px;
  text-align: center;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.load-more-card {
  flex: 0 0 auto;
  width: 70px;
  height: 70px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.load-more-card:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.load-more-icon {
  font-size: 16px;
  color: #4f46e5;
  font-weight: bold;
}

.load-more-text {
  font-size: 10px;
  color: #64748b;
  text-align: center;
  margin-top: 2px;
}

.remaining-count {
  font-size: 9px;
  color: #94a3b8;
  margin-top: 1px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .app-header {
    padding: 0 16px;
  }

  .app-main {
    flex-direction: column;
  }

  .app-sidebar {
    width: 100%;
    height: 200px;
  }

  .app-content {
    flex: 1;
  }

  .preview-section {
    margin: 8px;
  }

  .image-grid-section {
    margin: 0 8px 8px;
  }

  /* 加载文本 */
  .loading-text {
    color: #4f46e5;
    font-size: 14px;
    font-weight: 500;
  }

  /* 模态框样式 */
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
  }

  .modal-content {
    background: var(--bg-secondary);
    border-radius: var(--radius-lg);
    width: 500px;
    max-width: 90vw;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--border-color);
  }

  .modal-header {
    padding: 20px 24px;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: -0.025em;
  }

  .btn-close {
    background: none;
    border: none;
    font-size: 24px;
    color: #64748b;
    cursor: pointer;
    padding: 4px;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-close:hover {
    background: #f1f5f9;
    color: #1e293b;
  }

  .modal-body {
    padding: 20px 24px;
    flex: 1;
    overflow-y: auto;
  }

  .empty-paths {
    text-align: center;
    color: #64748b;
    padding: 40px 0;
  }

  .empty-paths .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  .path-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .path-item {
    display: flex;
    align-items: flex-start;
    padding: 16px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
  }

  .path-info {
    flex: 1;
    min-width: 0;
  }

  .path-name {
    font-weight: 500;
    color: #1e293b;
    margin-bottom: 4px;
  }

  .path-full {
    font-size: 12px;
    color: #64748b;
    margin-bottom: 8px;
    word-break: break-all;
  }

  .path-stats {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .stat-badge {
    background: #e0e7ff;
    color: #3730a3;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
  }

  .btn-remove {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    padding: 8px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-remove:hover {
    background: #fee2e2;
  }

  .modal-footer {
    padding: 16px 24px;
    border-top: 1px solid #f1f5f9;
    display: flex;
    justify-content: flex-end;
  }

  /* 背景设置样式 */
  .background-controls {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .control-group label {
    font-weight: 500;
    color: #1e293b;
    font-size: 14px;
  }

  .control-group input[type="range"] {
    width: 100%;
    height: 6px;
    background: #e2e8f0;
    border-radius: 3px;
    outline: none;
  }

  .opacity-value {
    font-size: 12px;
    color: #64748b;
    text-align: right;
  }

  .current-background {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }

  .background-preview {
    width: 60px;
    height: 40px;
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
  }

  .btn-remove-background {
    padding: 6px 12px;
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-remove-background:hover {
    background: #fee2e2;
  }
}</style>