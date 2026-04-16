# zTerm 项目规划

## 1. 项目概述

zTerm 是一款跨平台终端模拟器与远程连接管理工具，目标是提供类 VS Code 的用户体验，同时保持轻量和专注。

### 核心目标

- 提供高性能本地终端模拟器
- 支持 SSH 连接与后续 SFTP 文件管理
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
| SSH/SFTP | ssh2（SSH 终端、SFTP 文件树与基础上传/下载能力已接入） | Node.js 生态成熟 SSH2 实现 |
| 依赖注入 | inversify（可选后续） | 目前未作为必要前置 |
| 构建工具 | electron-vite 5 + Vite 6 | 快速 HMR，Electron 集成 |
| 状态管理 | Zustand 5 | 轻量，TypeScript 友好，无 boilerplate |
| 配置持久化 | electron-store | 用户设置与连接持久化 |
| 图标 | @vscode/codicons | VS Code 官方图标字体 |
| 包管理 | npm（Node.js 22 via nvm） | 当前开发约定 |

---

## 3. 架构设计

### 3.1 进程模型

```text
┌─────────────────────────────────────────────────┐
│                  Main Process                   │
│                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ PtyService  │  │ StoreService │  │SshService│ │
│  │ (node-pty)  │  │electron-store│  │  (ssh2)  │ │
│  └──────┬──────┘  └──────┬───────┘  └────┬─────┘ │
│         └────────────────┴───────────────┘       │
│                    IPC Bridge                    │
└─────────────────────────┼─────────────────────────┘
                          │ contextBridge
┌─────────────────────────┼─────────────────────────┐
│                Renderer Process                  │
│  ┌──────────────────────┴───────────────────────┐ │
│  │                Zustand Stores                │ │
│  │      workbench / terminal / connections      │ │
│  └──────────────────────┬───────────────────────┘ │
│  ┌──────────────────────┴───────────────────────┐ │
│  │               React Components               │ │
│  │   Workbench / Terminal / Sidebar / Dialog    │ │
│  └──────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────┘
```

### 3.2 IPC 通信设计

- **Renderer → Main**：`ipcRenderer.invoke` / `ipcRenderer.send`
- **Main → Renderer**：`webContents.send`
- preload 通过 `window.terminalApi` / `window.storeApi` / `window.connectionsApi` 暴露接口
- channel 常量统一定义在 `src/shared/ipc-channels.ts`

### 3.3 终端创建事件流

```text
用户点击 “Local Terminal” / SSH 连接项 / 新建终端动作
        │
        ▼
window.dispatchEvent('zterm:new-terminal')
        │
        ▼
TerminalPanel 监听事件 → addTab(tempId, metadata)
        │
        ▼
TerminalInstance 挂载 → 注册 onData / onExit
        │
        ▼
terminalApi.create({ cols, rows, ssh? })
        │
        ├─ 本地终端 → PtyService.spawn()
        └─ SSH 终端 → TerminalManagerService → SshService.spawn()
```

---

## 4. UI 布局

### 4.1 当前布局（已实现）

```text
┌────────────────────────────────────────────────────────┐
│                     Title Bar (38px)                  │
├──────┬─────────────┬──────────────────┬────────────────┤
│      │  Sidebar    │   Tab Bar        │                │
│ Act  │ (terminal   ├──────────────────┤  Auxiliary     │
│ ivity│  page only) │                  │  Sidebar       │
│ Bar  │ Connections │  Terminal Area   │   Explorer     │
│(48px)│  + tree     │  (xterm.js)      │                │
│      │             │                  │                │
├──────┴─────────────┴──────────────────┴────────────────┤
│                    Status Bar (22px)                  │
└────────────────────────────────────────────────────────┘
```

### 4.2 当前主页面与弹窗（已实现）

- 活动栏只保留两个主页面入口：
  - Terminal
  - Settings
- Terminal 页面保留三栏内容布局：连接侧边栏 / 终端主区 / Auxiliary Sidebar
- Settings 页面独占主区，并采用 VS Code 风格的搜索栏 + 左侧 TOC + 右侧 setting rows 布局
- SSH 连接新建 / 编辑通过终端页上的弹窗完成，不再占用独立主页面

### 4.3 主题与 CSS 变量体系

- 主题定义在 `src/shared/config/theme.config.ts`
- renderer 启动时会先读取持久化 `settings`，再通过 `applyTheme(getThemeById(settings.theme))` 注入颜色变量到 `:root`
- `src/renderer/styles/global.css` 中仅保留布局尺寸变量
- CSS 颜色消费统一使用 `var(--bg-editor)` / `var(--fg-editor)` 等变量
- `src/renderer/stores/settings.store.ts` 负责 settings 初始化、持久化与即时应用

---

## 5. 功能模块阶段状态

### Phase 1：本地终端（完成）

- [x] Electron 应用骨架 + React workbench 布局
- [x] xterm.js 集成 + node-pty 本地终端
- [x] 多 tab 支持
- [x] VS Code Dark+ 风格 UI
- [x] Sidebar 连接树基础结构
- [x] Sidebar 可折叠 + 拖拽调宽
- [x] 终端分屏（水平 / 垂直 split、pane resize、pane focus、pane close）
- [x] Electron 原生右键菜单（renderer/main 分层，参考 VS Code 桌面端语义）
- [x] 基础设置页
- [x] 快捷键系统

### Phase 1.5：架构整理（完成）

- [x] 技术债清理 / 结构整理
- [x] 主题系统骨架（配置抽取 + JS 注入 CSS 变量）
- [x] WebGL 渲染启用（含 fallback）
- [x] `ITerminalService` 抽象
- [x] `electron-store` 持久化 schema / `storeApi`
- [x] ESLint v9 flat config
- [x] 文档同步与交接文档完善

### Phase 2：SSH 连接管理（完成）

- [x] `ssh2` 集成（`SshService`）
- [x] SSH 连接保存 / 编辑 / 删除
- [x] 连接树中本地终端与 SSH 连接并存
- [x] 终端页 SSH 连接弹窗（新建 / 编辑）
- [x] `safeStorage` 凭据安全实现
- [x] SSH 终端会话（输入 / 输出 / resize 转发）
- [x] 失败信息在终端内展示
- [x] 连接图标按连接类型展示，不承载运行时状态

### Phase 3：SFTP 文件管理（进行中）

- [x] 统一 Explorer 文件树浏览（Auxiliary Sidebar，本地/SSH provider）
- [x] 文件上传 / 下载基础工作流（SSH 工具栏上传、右键下载）
- [x] Explorer 错误下沉到 StatusBar，文件树失败时仍保持可操作
- [ ] 拖拽上传 + 传输队列 + 进度
- [ ] Monaco Editor 集成（远程文件编辑）

### Future：增强功能

- [ ] 会话录制与回放
- [ ] 命令片段管理
- [ ] 多窗口支持
- [ ] 主题系统完善（亮色 / 自定义主题）
- [ ] 串口连接（serialport）
- [ ] RDP 远程桌面
- [ ] WebDAV 配置同步
- [ ] Plugin 系统

---

## 6. 关键技术决策记录

| 决策 | 选择 | 原因 |
|------|------|------|
| 不基于 VS Code 二次开发 | 全新实现，以 VS Code 为参考 | 避免继承 VS Code 的复杂历史包袱 |
| UI 技术栈 | React + TypeScript | 开发效率高，适合当前规模 |
| 终端实现 | xterm.js + node-pty | 成熟组合，VS Code 已验证 |
| SSH 实现 | `ssh2` + 保存连接记录 | 与现有终端工作区集成更直接 |
| 状态管理 | Zustand | 轻量、简单、TypeScript 友好 |
| 持久化 | electron-store | 足够支撑设置和连接数据 |
| 凭据安全 | Electron `safeStorage` | 借助系统级密钥链能力 |
| 主题系统 | JS 注入 CSS 变量 | 为未来主题切换预留能力 |
| WebGL 渲染 | 启用，失败自动 fallback | 在兼容性和性能之间取平衡 |
| 服务解耦 | `ITerminalService` + `TerminalManagerService` | 统一本地 PTY 与 SSH 会话入口 |
| 连接编辑 UI | 终端页弹窗 | 避免额外主页面，保持工作台收敛 |
| 连接图标语义 | 仅表达连接类型 | 保持导航列表稳定，不表达运行时状态 |
| 右键菜单实现 | Electron 原生菜单 + renderer/main 分层 | 对齐 VS Code 桌面端语义，业务逻辑仍留在 renderer |
| Explorer 错误展示 | 底部 StatusBar | 避免错误覆盖文件树，保留后续导航与重试能力 |

---

## 7. 规划入口说明

- 当前新的实现规范主入口：`openspec/specs/`
- 已完成 change 的历史记录：`openspec/changes/archive/`
- `docs/superpowers/` 保留为历史规划记录，仅作背景参考

---

## 8. 参考资源

- VS Code 源码：`/Users/huyuanzhe/prj-code/vscode`
  - 终端：`src/vs/workbench/contrib/terminal/`
  - sash：`src/vs/base/browser/ui/sash/sash.ts`
  - 布局：`src/vs/workbench/browser/layout.ts`
- xterm.js：<https://xtermjs.org/>
- node-pty：<https://github.com/microsoft/node-pty>
- ssh2：<https://github.com/mscdex/ssh2>
- electron-vite：<https://electron-vite.org/>
