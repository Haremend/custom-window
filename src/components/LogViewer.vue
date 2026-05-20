<template>
  <div class="log-viewer">
    <div class="log-header">
      <h3>System Logs</h3>
      <div class="log-controls">
        <select v-model="selectedLevel" @change="filterLogs">
          <option value="">All Levels</option>
          <option value="DEBUG">DEBUG</option>
          <option value="INFO">INFO</option>
          <option value="WARN">WARN</option>
          <option value="ERROR">ERROR</option>
        </select>

        <input
          v-model="searchKeyword"
          type="text"
          placeholder="Search logs..."
          @input="searchLogs"
          class="search-input"
        />

        <button @click="exportLogs" class="btn btn-secondary">Export Logs</button>
        <button @click="clearLogs" class="btn btn-danger">Clear Logs</button>
        <button @click="refreshLogs" class="btn btn-primary">Refresh</button>
      </div>
    </div>

    <div class="log-stats">
      <div class="stat-item">
        <span class="stat-label">Total:</span>
        <span class="stat-value">{{ stats.total }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">DEBUG:</span>
        <span class="stat-value debug">{{ stats.debug }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">INFO:</span>
        <span class="stat-value info">{{ stats.info }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">WARN:</span>
        <span class="stat-value warn">{{ stats.warn }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">ERROR:</span>
        <span class="stat-value error">{{ stats.error }}</span>
      </div>
    </div>

    <div class="log-content">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span>Loading logs...</span>
      </div>

      <div v-else-if="filteredLogs.length === 0" class="empty-state">
        <div class="empty-icon">📝</div>
        <h4>No Logs</h4>
        <p>No log entries found with current filters</p>
      </div>

      <div v-else class="log-list">
        <div
          v-for="log in paginatedLogs"
          :key="log.id"
          class="log-entry"
          :class="`log-level-${log.level.toLowerCase()}`"
        >
          <div class="log-time">{{ formatTime(log.timestamp) }}</div>
          <div class="log-level" :class="`level-${log.level.toLowerCase()}`">
            {{ log.level }}
          </div>
          <div class="log-message">{{ log.message }}</div>
          <div v-if="log.data" class="log-data" @click="toggleLogData(log.id)">
            <span class="data-toggle">
              {{ expandedLogs.has(log.id) ? '▼' : '▶' }} Data
            </span>
            <div v-if="expandedLogs.has(log.id)" class="data-content">
              <pre>{{ formatLogData(log.data) }}</pre>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="totalPages > 1" class="log-pagination">
          <button
            @click="currentPage--"
            :disabled="currentPage <= 1"
            class="page-btn"
          >
            Previous
          </button>
          <span class="page-info">
            Page {{ currentPage }} / {{ totalPages }}
          </span>
          <button
            @click="currentPage++"
            :disabled="currentPage >= totalPages"
            class="page-btn"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import logger from '../utils/logger'

export default {
  name: 'LogViewer',
  data() {
    return {
      logs: [],
      filteredLogs: [],
      selectedLevel: '',
      searchKeyword: '',
      loading: false,
      expandedLogs: new Set(),
      currentPage: 1,
      pageSize: 50,
      stats: {
        total: 0,
        debug: 0,
        info: 0,
        warn: 0,
        error: 0
      }
    }
  },
  computed: {
    totalPages() {
      return Math.ceil(this.filteredLogs.length / this.pageSize)
    },
    paginatedLogs() {
      const start = (this.currentPage - 1) * this.pageSize
      const end = start + this.pageSize
      return this.filteredLogs.slice(start, end)
    }
  },
  methods: {
    async loadLogs() {
      this.loading = true
      try {
        this.logs = logger.getLogs()
        this.updateStats()
        this.filterLogs()
      } catch (error) {
        logger.error('Failed to load logs:', error)
      } finally {
        this.loading = false
      }
    },

    updateStats() {
      this.stats = logger.getStats()
    },

    filterLogs() {
      let filtered = this.logs

      // 按级别过滤
      if (this.selectedLevel) {
        filtered = filtered.filter(log => log.level === this.selectedLevel)
      }

      // 按关键词搜索
      if (this.searchKeyword) {
        filtered = logger.searchLogs(this.searchKeyword)
        if (this.selectedLevel) {
          filtered = filtered.filter(log => log.level === this.selectedLevel)
        }
      }

      this.filteredLogs = filtered
      this.currentPage = 1
    },

    searchLogs() {
      this.filterLogs()
    },

    async clearLogs() {
      if (confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
        logger.clearLogs()
        await this.loadLogs()
      }
    },

    exportLogs() {
      logger.exportLogs()
    },

    refreshLogs() {
      this.loadLogs()
    },

    toggleLogData(logId) {
      if (this.expandedLogs.has(logId)) {
        this.expandedLogs.delete(logId)
      } else {
        this.expandedLogs.add(logId)
      }
    },

    formatTime(timestamp) {
      return new Date(timestamp).toLocaleString('en-US')
    },

    formatLogData(data) {
      if (typeof data === 'object') {
        return JSON.stringify(data, null, 2)
      }
      return String(data)
    }
  },
  mounted() {
    this.loadLogs()
  }
}
</script>

<style scoped>
.log-viewer {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  font-family: 'Segoe UI', 'Microsoft YaHei', Arial, sans-serif;
}

.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e1e5e9;
}

.log-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333333;
}

.log-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.log-controls select,
.search-input {
  padding: 6px 10px;
  border: 1px solid #d1d9e0;
  border-radius: 3px;
  font-size: 12px;
  background: #ffffff;
}

.search-input {
  width: 200px;
}

.btn {
  padding: 6px 12px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;
}

.btn-primary {
  background: #2196f3;
  color: #ffffff;
  border-color: #1976d2;
}

.btn-primary:hover {
  background: #1976d2;
}

.btn-secondary {
  background: #ffffff;
  border-color: #d1d9e0;
  color: #333333;
}

.btn-secondary:hover {
  background: #f5f5f5;
}

.btn-danger {
  background: #dc3545;
  color: #ffffff;
  border-color: #c82333;
}

.btn-danger:hover {
  background: #c82333;
}

.log-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e1e5e9;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.stat-label {
  color: #666666;
}

.stat-value {
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  background: #e1e5e9;
  color: #333333;
}

.stat-value.debug {
  background: #e8f5e8;
  color: #2e7d32;
}

.stat-value.info {
  background: #e3f2fd;
  color: #1976d2;
}

.stat-value.warn {
  background: #fff3e0;
  color: #f57c00;
}

.stat-value.error {
  background: #ffebee;
  color: #c62828;
}

.log-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.loading-state,
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666666;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-state h4 {
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

.log-list {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.log-entry {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 20px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 12px;
  line-height: 1.4;
}

.log-entry:hover {
  background: #f8f9fa;
}

.log-time {
  color: #666666;
  font-family: 'Consolas', 'Courier New', monospace;
  min-width: 140px;
  font-size: 11px;
}

.log-level {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  min-width: 50px;
  text-align: center;
}

.level-debug {
  background: #e8f5e8;
  color: #2e7d32;
}

.level-info {
  background: #e3f2fd;
  color: #1976d2;
}

.level-warn {
  background: #fff3e0;
  color: #f57c00;
}

.level-error {
  background: #ffebee;
  color: #c62828;
}

.log-message {
  flex: 1;
  color: #333333;
  word-break: break-word;
}

.log-data {
  margin-left: auto;
}

.data-toggle {
  color: #2196f3;
  cursor: pointer;
  font-size: 11px;
  text-decoration: underline;
}

.data-toggle:hover {
  color: #1976d2;
}

.data-content {
  margin-top: 4px;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 3px;
  border: 1px solid #e1e5e9;
}

.data-content pre {
  margin: 0;
  font-size: 11px;
  color: #333333;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Consolas', 'Courier New', monospace;
}

.log-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-top: 1px solid #e1e5e9;
}

.page-btn {
  padding: 6px 12px;
  background: #ffffff;
  border: 1px solid #d1d9e0;
  border-radius: 3px;
  font-size: 12px;
  color: #333333;
  cursor: pointer;
  transition: all 0.15s ease;
}

.page-btn:hover:not(:disabled) {
  background: #f5f5f5;
  border-color: #2196f3;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 12px;
  color: #666666;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .log-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .log-controls {
    flex-wrap: wrap;
  }

  .search-input {
    width: 150px;
  }

  .log-entry {
    flex-direction: column;
    gap: 4px;
  }

  .log-time {
    min-width: auto;
  }

  .log-level {
    align-self: flex-start;
  }
}
</style>