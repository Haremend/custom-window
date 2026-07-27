# CLAUDE.md

本文是 Claude Code（claude.ai/code）在本仓库工作时的指导文档。

## 常用开发命令

| 任务                                      | 命令                                               | 说明                                                        |
| ----------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------- |
| 安装依赖                                  | `npm install`                                      | 安装 `package.json` 中列出的所有生产和开发依赖。            |
| 运行开发服务器（Vite HMR）                | `npm run dev`                                      | 启动 Vite 开发服务器（热模块重载），用于开发 Vue 页面。     |
| 构建生产版本                              | `npm run build`                                    | 使用 Vite 将代码编译到 `dist/` 目录，并执行 TypeScript 编译。|
| 启动 Electron（已构建的应用）              | `npm run electron`                                 | 通过 Electron 加载已构建好的渲染进程 (`dist/index.html`)。  |
| 完整启动（构建 + 运行）                   | `npm run start`                                    | 执行 `npm run build` 后运行 `npm run electron` 的快捷方式。|
| 使用 Vite 预览构建产物（不启动 Electron） | `npm run preview`                                  | 在浏览器中预览已构建的 UI。                                 |
| Lint / 修复                               | `npm run lint` / `npm run lint:fix`               | 使用 ESLint 检查/修复 `.ts`, `.js`, `.vue` 文件。           |
| 格式化                                    | `npm run format`                                   | 使用 Prettier 格式化代码。                                  |

## 项目架构

### 技术栈
- **Vue 3** + **Element Plus**（UI 组件库）
- **Electron**（桌面应用框架）
- **Vite**（构建工具）
- **Sharp**（图片缩略图生成）
- **TypeScript**（主进程及预加载脚本）

### 目录结构

```
electron-main/
  main.ts      – 主进程入口。创建 BrowserWindow、注册自定义协议(app://)、设置 IPC 处理函数
  preload.ts   – 通过 contextBridge 将安全 API 暴露给渲染进程
src/
  main.ts      – Vue 入口。挂载根组件、初始化 Pinia / Element Plus
  App.vue      – 根组件。包含全部 UI：工具栏、文件夹列表、图片网格、日志查看器对话框
  styles.css   – 全局样式
  components/
    LogViewer.vue  – 日志查看器对话框组件（被 App.vue 引用）
  utils/
    logger.js      – 日志工具。封装 console，提供分级日志，日志存储于 localStorage
```

### Electron 主进程 (`electron-main/`)

- **`main.ts`** – 主进程入口
  - 创建 `BrowserWindow`
  - 注册自定义 `app://` 协议（用于读取缩略图缓存，限制访问 `picTemp/` 目录）
  - IPC 处理函数：`select-folder`、`get-folder-stats`、`get-images-in-folder`、`read-log-file`、`write-log-file`、`load-config`、`save-config`、`get-image-data-url`、`get-thumbnail`、`generate-thumbnails`
  - 配置/日志文件持久化至 Electron 用户数据目录（`config.json`、`app-logs.json`）

- **`preload.ts`** – 预加载脚本
  - 通过 `contextBridge.exposeInMainWorld` 暴露 `window.electronAPI`
  - 渲染进程通过 `window.electronAPI.<method>` 调用主进程功能

### 渲染进程 (`src/`)

- **`App.vue`** – 当前所有的 UI 逻辑都集中在该文件中，包括：
  - **工具栏**：添加/删除监控路径、刷新、打开日志查看器
  - **文件夹列表**：展示子文件夹，支持按名称/修改时间/图片数量排序
  - **图片网格 + 弹窗预览**：使用 `IntersectionObserver` 懒加载缩略图，点击图片可弹窗查看大图
  - **日志查看器**：通过对话框显示系统日志
  - **注意**：目前 `FileList`、`ImagePreview`、`Toolbar` 并非独立组件，而是直接内联在 `App.vue` 中

- **状态管理**：目前未使用 Pinia store，所有状态直接管理在 `App.vue` 的 `data()` 中

- **`main.ts`** 额外导入了 `element-plus`（UI 组件库）和 `photoswipe`（图片浏览库）

### 配置与持久化

- **配置**：`config.json`（Electron 用户数据目录），通过 IPC `load-config` / `save-config` 读写
  - 内容：`watchedPaths`（监控路径数组）、`lastUpdated`（最近更新时间戳）
- **日志**：主进程 `app-logs.json`（Electron 用户数据目录）；前端 `logger.js` 使用 `localStorage` 存储日志
- **缩略图缓存**：`picTemp/` 目录，使用 `sharp` 生成 `webp` 格式，通过 `app://` 协议安全访问

### 构建与运行

- `NODE_ENV=development` 时，Electron 加载 `http://localhost:5173`
- 生产模式加载打包后的 `dist/index.html`
- 项目未配置打包脚本（如 `electron-builder`），如需分发需自行添加

## 缩略图生成流程

1. 选中文件夹后，`getImagesInFolder` 返回图片元数据
2. `loadExistingThumbnails` 调用 `get-thumbnail` 检查缓存
3. 对缺失的缩略图，使用 `generateThumbnails` 批量生成并写入 `picTemp/`
4. 生成的缩略图通过 `app://` 协议提供（路径被限制在 `picTemp/` 目录内）
5. `IntersectionObserver` 监听图片节点，进入视口时触发加载，优先获取缩略图，失败则回退到原图

## 给 Claude Code 的开发建议

- 修改 IPC 处理函数时，请同步更新 `App.vue` 中对应的调用，保持接口一致
- 新增 UI 组件建议从 `App.vue` 中拆出独立组件，而非继续内联
- 生产模式下请先执行 `npm run build`，验证加载 `dist/index.html` 的行为
- `vue-virtual-scroller` 依赖已安装但当前未使用（相关代码已注释）
