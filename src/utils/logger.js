/**
 * 专业的前端日志工具类
 * 支持日志级别、持久化存储、日志轮转等功能
 */

class Logger {
  constructor() {
    this.levels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3
    };

    this.currentLevel = this.levels.DEBUG;
    this.maxLogEntries = 1000; // Maximum log entries
    this.logKey = 'image-manager-logs';
    this.logs = this.loadLogsFromStorage();

    // Clean up old logs on initialization
    this.cleanupOldLogs();
  }

  /**
   * 设置日志级别
   */
  setLevel(level) {
    if (this.levels.hasOwnProperty(level)) {
      this.currentLevel = this.levels[level];
      console.log(`[Logger] Log level set to: ${level}`);
    }
  }

  /**
   * 获取当前日志级别
   */
  getLevel() {
    return Object.keys(this.levels).find(
      key => this.levels[key] === this.currentLevel
    );
  }

  /**
   * 添加日志
   */
  log(level, message, data = null) {
    if (this.levels[level] >= this.currentLevel) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        data,
        id: this.generateId()
      };

      // 控制台输出
      this.logToConsole(logEntry);

      // 添加到内存
      this.logs.push(logEntry);

      // 持久化到本地存储
      this.saveLogsToStorage();

      // 清理过期日志
      this.cleanupOldLogs();
    }
  }

  /**
   * 调试级别日志
   */
  debug(message, data = null) {
    this.log('DEBUG', message, data);
  }

  /**
   * 信息级别日志
   */
  info(message, data = null) {
    this.log('INFO', message, data);
  }

  /**
   * 警告级别日志
   */
  warn(message, data = null) {
    this.log('WARN', message, data);
  }

  /**
   * 错误级别日志
   */
  error(message, data = null) {
    this.log('ERROR', message, data);
  }

  /**
   * 控制台输出
   */
  logToConsole(logEntry) {
    const { timestamp, level, message, data } = logEntry;
    const time = new Date(timestamp).toLocaleTimeString();
    const prefix = `[${time}] [${level}]`;

    switch (level) {
      case 'DEBUG':
        console.debug(`${prefix} ${message}`, data || '');
        break;
      case 'INFO':
        console.info(`${prefix} ${message}`, data || '');
        break;
      case 'WARN':
        console.warn(`${prefix} ${message}`, data || '');
        break;
      case 'ERROR':
        console.error(`${prefix} ${message}`, data || '');
        break;
    }
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 从本地存储加载日志
   */
  loadLogsFromStorage() {
    try {
      const stored = localStorage.getItem(this.logKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load logs:', error);
      return [];
    }
  }

  /**
   * 保存日志到本地存储
   */
  saveLogsToStorage() {
    try {
      localStorage.setItem(this.logKey, JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to save logs:', error);
    }
  }

  /**
   * 清理过期日志
   */
  cleanupOldLogs() {
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(-this.maxLogEntries);
      this.saveLogsToStorage();
    }
  }

  /**
   * 获取所有日志
   */
  getLogs(level = null) {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  /**
   * 按时间范围获取日志
   */
  getLogsByTimeRange(startTime, endTime) {
    return this.logs.filter(log => {
      const logTime = new Date(log.timestamp);
      return logTime >= startTime && logTime <= endTime;
    });
  }

  /**
   * 搜索日志
   */
  searchLogs(keyword) {
    return this.logs.filter(log =>
      log.message.toLowerCase().includes(keyword.toLowerCase()) ||
      (log.data && JSON.stringify(log.data).toLowerCase().includes(keyword.toLowerCase()))
    );
  }

  /**
   * 清空日志
   */
  clearLogs() {
    this.logs = [];
    this.saveLogsToStorage();
    console.log('[Logger] All logs cleared');
  }

  /**
   * 导出日志
   */
  exportLogs(filename = null) {
    const data = JSON.stringify(this.logs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `image-manager-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * 获取日志统计信息
   */
  getStats() {
    const stats = {
      total: this.logs.length,
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      oldestLog: null,
      newestLog: null
    };

    this.logs.forEach(log => {
      stats[log.level.toLowerCase()]++;
    });

    if (this.logs.length > 0) {
      stats.oldestLog = this.logs[0].timestamp;
      stats.newestLog = this.logs[this.logs.length - 1].timestamp;
    }

    return stats;
  }
}

// 创建全局日志实例
const logger = new Logger();

// 导出日志实例和类
export default logger;
export { Logger };