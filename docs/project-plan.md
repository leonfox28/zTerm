# zTerm 项目规划

## 1. 项目概述

zTerm 是一款跨平台终端模拟器与远程连接管理工具，目标是提供类 VS Code 的用户体验，同时保持轻量和专注。

### 核心目标

- 提供高性能本地终端模拟器
- 支持 SSH 连接与 SFTP 文件管理
- 类 VS Code 的 workbench 布局与交互体验
- 可扩展架构，为未来协议（串口、RDP 等）预留接入点

---

## 2. 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 桌面框架 | Electron 39 | 跨平台，Node.js 22，成熟的 Chromium 方案 |
| UI 框架 | React 19 + TypeScript | 组件化开发，生态丰富 |
| 终端渲染 | xterm.js (@xterm/xterm v6) | VS Code 同款，GPU 加速，addon 生态完善 |
| 本地终端后端 | node-pty v1 | VS Code 同款，跨平台 PTY 实现 |
| SSH/SFTP | ssh2（待引入） | Node.js 生态最成熟的 SSH2 协议实现 |
| 依赖注入 | inversify（待使用） | 轻量 TypeScript DI 容器，装饰器模式 |
| 构建工具 | electron-vite 5 + Vite 6 | 快速 HMR，Electron 集成 |
| 状态管理 | Zustand 5 | 轻量，TypeScript 友好，无 boilerplate |
| 图标 | @vscode/codicons | VS Code 官方图标字体 |
| 包管理 | npm（Node.js 22 via nvm） | — |

---

## 3. 架构设计

### 3.1 进程模型

```
┌─────────────────────────────────────────────────┐
│                  Main Process                     │
│                                                   │
│  ┌─────────────┐  ┌──────────┐  ┌────────────┐  │
│  │ PtyService  │  │SshService│  │ FileService │  │
│  │ (node-pty)  │  │  (ssh2)  │  │   (SFTP)   │  │
│  └──────┬──────┘  └────┬─────┘  └─────┬──────┘  │
│         └───────────────┼──────────────┘          │
│                    IPC Bridge                      │
└─────────────────────────┼─────────────────────────┘
                          │ contextBridge (terminalApi)
┌─────────────────────────┼─────────────────────────┐
│                  Renderer Process                   │
│  ┌──────────────────────┴───────────────────────┐ │
│  │              Zustand Stores                   │ │
│  │  workbench / terminal / connections           │ │
│  └──────────────────────┬───────────────────────┘ │
│  ┌──────────────────────┴───────────────────────┐ │
│  │              React Components                 │ │
│  │  Workbench / Terminal / Sidebar / Tabs        │ │
│  └──────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────┘
```

### 3.2 IPC 通信设计

- **Renderer → Main**: `ipcRenderer.invoke`（请求-响应，如 terminal:create）
- **Main → Renderer**: `webContents.send`（事件推送，如 terminal:data）
- contextBridge 通过 `window.terminalApi` 暴露给渲染进程
- channel 常量统一定义在 `src/shared/ipc-channels.ts`

### 3.3 新建终端的事件流

```
用户点击 + 按钮 / "Local Terminal"
        │
        ▼
window.dispatchEvent('zterm:new-terminal')
        │
        ▼
TerminalPanel 监听事件 → addTab(tempId)
        │
        ▼
TerminalInstance 挂载 → 注册 onData 监听
        │
        ▼
terminalApi.create({cols, rows}) → IPC → PtyService.spawn()
        │
        ▼
返回 ptyId → 绑定 onData / onResize / onExit
```

---

## 4. UI 布局

### 4.1 当前布局（已实现）

```
┌────────────────────────────────────────────────────────┐
│                      Title Bar (38px)                   │
├──────┬─────────────┬──────────────────┬────────────────┤
│      │  Sidebar    │   Tab Bar        │                │
│ Act  │ (240px,     ├──────────────────┤  Auxiliary     │
│ ivity│  resizable) │                  │  Sidebar       │
│ Bar  │             │  Terminal Area   │  (240px)       │
│(48px)│ CONNECTIONS │  (xterm.js)      │                │
│      │  + tree     │                  │                │
├──────┴─────────────┴──────────────────┴────────────────┤
│                    Status Bar (22px)                    │
└────────────────────────────────────────────────────────┘
```

### 4.2 布局交互（已实现）

- Sidebar 可通过点击活动栏图标折叠/展开（toggle：点击已激活项隐藏）
- Sidebar 右边缘可拖拽调宽（范围 170–500px），拖到 120px 以下自动隐藏
- Sash（拖拽条）拖拽期间保持蓝色高亮（active class）
- Tab 栏溢出时横向滚动，切换 tab 自动滚动到可见区域（`getBoundingClientRect` 精确计算）
- 鼠标滚轮在 tab 栏上横向滚动

### 4.3 CSS 变量体系（global.css）

主题色彩全部通过 CSS 变量定义，对齐 VS Code Dark+ 精确色值：
- `--bg-editor: #1e1e1e`、`--bg-sidebar: #252526`、`--bg-activitybar: #333333`
- `--bg-statusbar: #007acc`、`--tab-active-border-top: #007acc`
- 等，参见 `src/renderer/styles/global.css`

---

## 5. 功能模块规划

### Phase 1: 本地终端（基本完成）

- [x] Electron 应用骨架 + React workbench 布局
- [x] xterm.js 集成 + node-pty 本地终端（login shell，xterm-256color）
- [x] 多 tab 支持（新建、关闭、切换、溢出滚动）
- [x] VS Code Dark+ 主题 UI（Activity Bar codicons、Tab 栏、Status Bar）
- [x] Sidebar 连接管理树（Local Terminal 项、文件夹结构，保存连接待 SSH 实现）
- [x] Sidebar 可折叠 + 拖拽调宽
- [ ] 终端分屏（水平/垂直）
- [ ] 基础设置（字体、主题、shell 路径，含是否 login shell 的开关）
- [ ] 快捷键系统

### Phase 2: SSH 连接（下一阶段）

- [ ] 新建连接弹窗（选择连接类型：Local / SSH）
- [ ] SSH 连接配置（主机、端口、用户名、密码/密钥）
- [ ] 连接保存到 connections store 并持久化
- [ ] SSH 终端会话（ssh2 接入 main process SshService）
- [ ] 连接状态监控与自动重连
- [ ] Sidebar 树中已保存连接的编辑/删除/分组

### Phase 3: SFTP 文件管理

- [ ] 远程文件树浏览（Auxiliary Sidebar）
- [ ] 文件上传/下载（支持拖拽）
- [ ] 文件编辑（集成 Monaco Editor）
- [ ] 传输队列与进度显示

### Phase 4: 增强功能

- [ ] 会话录制与回放
- [ ] 命令片段管理（snippets）
- [ ] 多窗口支持
- [ ] 主题系统（亮色/暗色/自定义）

### Future: 协议扩展

- [ ] 串口连接（serialport）
- [ ] RDP 远程桌面
- [ ] Plugin 系统（AI 补全/分析）

---

## 6. 项目结构

```
zTerm/
├── docs/
│   ├── project-plan.md         # 本文件
│   └── handoff.md              # 交接文档（上下文快照）
├── src/
│   ├── main/
│   │   ├── main.ts             # 主进程入口，BrowserWindow
│   │   ├── services/
│   │   │   └── pty.service.ts  # PTY 进程管理
│   │   └── ipc/
│   │       └── terminal.ipc.ts # IPC handler 注册
│   ├── preload/
│   │   └── index.ts            # contextBridge → window.terminalApi
│   ├── renderer/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── env.d.ts            # Window 类型扩展 + CSS 模块声明
│   │   ├── components/
│   │   │   ├── workbench/      # Workbench Titlebar ActivityBar Sidebar Sash AuxiliarySidebar StatusBar MainArea
│   │   │   ├── terminal/       # TerminalTabs TerminalPanel TerminalInstance
│   │   │   └── sidebar/        # ConnectionTree
│   │   ├── stores/
│   │   │   ├── workbench.store.ts    # sidebarVisible / sidebarWidth / activeViewId
│   │   │   ├── terminal.store.ts     # tabs / activeTabId
│   │   │   └── connections.store.ts  # 连接树（folders / items）
│   │   └── styles/
│   │       ├── global.css      # CSS 变量 + codicons import + scrollbar
│   │       ├── workbench.css   # 布局 grid + 各区域样式 + sash
│   │       ├── terminal.css    # tab 栏 + terminal panel
│   │       └── sidebar.css     # 连接树样式
│   └── shared/
│       ├── ipc-channels.ts     # IPC channel 名称常量
│       └── types/terminal.ts   # IShellOptions / ITerminalData / ITerminalExit
├── tsconfig.json               # 基础 TS 配置（含 jsx: react-jsx）
├── tsconfig.node.json          # 主进程 TS 配置
├── tsconfig.web.json           # 渲染进程 TS 配置
├── electron.vite.config.ts     # electron-vite 构建配置
├── .nvmrc                      # Node.js 22
├── .prettierrc
├── package.json
└── README.md
```

---

## 7. 开发环境

- **Node.js**: 22（`nvm use 22`，见 `.nvmrc`）
- **包管理**: npm
- **平台**: macOS（主开发环境）；Windows 后续验证
- **启动**: `npm run dev`
- **macOS 注意**: 首次 `npm install` 后需要 `chmod +x node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper`

---

## 8. 关键技术决策记录

| 决策 | 选择 | 原因 |
|------|------|------|
| 不基于 VS Code 二次开发 | 全新开发，以 VS Code 为参照 | VS Code 架构过于复杂，无关功能太多 |
| UI 框架选 React | 非原生 DOM | 开发效率优先，生态丰富 |
| 终端用 xterm.js | 非自研 | 业界标准，VS Code 验证过的方案 |
| 构建用 electron-vite | 非 webpack | 更快的 HMR，Electron 集成简单 |
| 状态管理用 Zustand | 非 Redux | 轻量无 boilerplate，适合中型应用 |
| PTY 启动用 login shell | `spawn(shell, ['-l'])` | 非 login shell 缺少用户 PATH 等环境变量 |
| Sidebar 宽度用 inline style | 非 CSS 变量 | 需要 JS 实时控制，CSS 变量动态更新有延迟 |
| Tab scroll 用 getBoundingClientRect | 非 offsetLeft | offsetLeft 依赖 offsetParent，flex 容器下不可靠 |

---

## 9. 参考资源

- VS Code 源码: `/Users/huyuanzhe/prj-code/vscode`
  - 终端实现: `src/vs/workbench/contrib/terminal/`
  - Tab 滚动: `src/vs/workbench/browser/parts/editor/multiEditorTabsControl.ts`
  - Sash 组件: `src/vs/base/browser/ui/sash/sash.ts`
  - 布局系统: `src/vs/workbench/browser/layout.ts`
- [xterm.js 文档](https://xtermjs.org/)
- [node-pty](https://github.com/microsoft/node-pty)
- [ssh2](https://github.com/mscdex/ssh2)
- [electron-vite](https://electron-vite.org/)
