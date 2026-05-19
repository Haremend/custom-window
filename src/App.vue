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

        <div class="path-section">
          <span class="path-label">当前路径:</span>
          <div class="path-display">
            <span v-if="currentPath" class="current-path">{{ currentPath }}</span>
            <span v-else class="no-path">请选择或添加路径</span>
          </div>
        </div>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <main class="explorer-main">
      <!-- 文件夹列表 -->
      <div class="folder-list-container">
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
          <h3>{{ selectedFolder.name }} - 图片列表</h3>
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

          <div v-else class="image-grid-list">
            <div
              v-for="image in allImages"
              :key="image.path"
              class="image-item"
              @click="openImageViewer(image)"
            >
              <div class="image-thumb">
                <img :src="getImageUrl(image.path)" :alt="image.name" />
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
      loading: false,
      loadingImages: false,
      configLoaded: false,
      showPathManager: false,
      sortBy: 'count',
      sortOrder: 'desc',
      currentPath: '',
      loadedImages: new Set()
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
              this.currentPath = folderPath
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
        if (window.electronAPI) {
          const config = await window.electronAPI.loadConfig()
          if (config) {
            this.watchedPaths = config.watchedPaths || []
            this.currentPath = this.watchedPaths[0] || ''
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
        console.error('Error refreshing folder stats:', error)
      }
    },

    async selectFolder(folder) {
      try {
        this.selectedFolder = folder
        this.allImages = []
        this.loadedImages.clear()

        if (window.electronAPI) {
          this.loadingImages = true
          const images = await window.electronAPI.getImagesInFolder(folder.path)
          this.allImages = images || []
        }
      } catch (error) {
        console.error('Error selecting folder:', error)
        alert('加载文件夹失败: ' + error.message)
      } finally {
        this.loadingImages = false
      }
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
    }
  },
  async mounted() {
    console.log('App mounted, Electron API available:', !!window.electronAPI)
    await this.loadConfig()
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
  overflow-y: auto;
  padding: 16px;
}

.image-grid-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}

.image-item {
  background: #ffffff;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.image-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: #2196f3;
}

.image-thumb {
  aspect-ratio: 1;
  overflow: hidden;
  background: #f5f5f5;
}

.image-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
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