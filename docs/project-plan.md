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
│  │   Workbench / Terminal / Sidebar / Tabs      │ │
│  └──────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────┘
```

### 3.2 IPC 通信设计

- **Renderer → Main**：`ipcRenderer.invoke` / `ipcRenderer.send`
- **Main → Renderer**：`webContents.send`
- preload 通过 `window.terminalApi` / `window.storeApi` 暴露接口
- channel 常量统一定义在 `src/shared/ipc-channels.ts`

### 3.3 新建终端事件流

```text
用户点击 + 按钮 / “Local Terminal”
        │
        ▼
window.dispatchEvent('zterm:new-terminal')
        │
        ▼
TerminalPanel 监听事件 → addTab(tempId)
        │
        ▼
TerminalInstance 挂载 → 先注册 onData / onExit
        │
        ▼
terminalApi.create({ cols, rows }) → IPC → PtyService.spawn()
        │
        ▼
返回 ptyId → 绑定 onData / onResize / onExit
```

---

## 4. UI 布局

### 4.1 当前布局（已实现）

```text
┌────────────────────────────────────────────────────────┐
│                     Title Bar (38px)                  │
├──────┬─────────────┬──────────────────┬────────────────┤
│      │  Sidebar    │   Tab Bar        │                │
│ Act  │ (240px,     ├──────────────────┤  Auxiliary     │
│ ivity│  resizable) │                  │  Sidebar       │
│ Bar  │             │  Terminal Area   │  (240px)       │
│(48px)│ CONNECTIONS │  (xterm.js)      │                │
│      │  + tree     │                  │                │
├──────┴─────────────┴──────────────────┴────────────────┤
│                    Status Bar (22px)                  │
└────────────────────────────────────────────────────────┘
```

### 4.2 当前交互（已实现）

- Sidebar 可点击活动栏图标折叠 / 展开
- Sidebar 右边缘可拖拽调宽（170–500px，<120px 自动隐藏）
- Sash 拖拽期间保持高亮
- Tab 栏支持横向滚动，切换 tab 自动滚动到可见区域
- 鼠标滚轮可驱动 tab 栏横向滚动

### 4.3 主题与 CSS 变量体系

- 主题定义在 `src/shared/config/theme.config.ts`
- renderer 启动时通过 `applyTheme(darkPlusTheme)` 注入颜色变量到 `:root`
- `src/renderer/styles/global.css` 中仅保留布局尺寸变量
- CSS 颜色消费统一使用 `var(--bg-editor)` / `var(--fg-editor)` 这类变量
- `src/renderer/utils/theme.ts` 的 `toCssVar()` 已修复，当前是正确状态

---

## 5. 功能模块规划

### Phase 1：本地终端（基本完成）

- [x] Electron 应用骨架 + React workbench 布局
- [x] xterm.js 集成 + node-pty 本地终端（login shell，xterm-256color）
- [x] 多 tab 支持（新建、关闭、切换、溢出滚动）
- [x] VS Code Dark+ 风格 UI
- [x] Sidebar 连接管理树（Local Terminal 项、文件夹结构）
- [x] Sidebar 可折叠 + 拖拽调宽

### Phase 1.5：架构整理（已完成）

- [x] 技术债清理 / 结构整理
- [x] 主题系统骨架（配置抽取 + JS 注入 CSS 变量）
- [x] WebGL 渲染启用（含 fallback）
- [x] `ITerminalService` 抽象
- [x] `electron-store` 持久化 schema / `storeApi`
- [x] ESLint v9 flat config
- [x] 文档同步与交接文档完善
- [x] 运行时收尾修复（store 构造兼容、theme 变量映射）

### Phase 1 剩余事项

- [ ] 终端分屏（水平 / 垂直）
- [ ] 基础设置页（字体、主题、shell 路径、是否 login shell）
- [ ] 快捷键系统

### Phase 2：SSH 连接

- [ ] 引入 inversify DI 容器，注册 PtyService / SshService
- [ ] `ssh2` 集成（`SshService implements ITerminalService`）
- [ ] 新建连接弹窗（Local / SSH 类型选择 + 配置表单）
- [ ] `safeStorage` 凭据安全实现
- [ ] 连接保存 / 编辑 / 删除
- [ ] 连接状态监控与自动重连
- [ ] Sidebar 连接树完善（状态、分组、右键菜单）

### Phase 3：SFTP 文件管理

- [ ] 远程文件树浏览（Auxiliary Sidebar 激活）
- [ ] 文件上传 / 下载（拖拽 + 队列 + 进度）
- [ ] Monaco Editor 集成（远程文件编辑）

### Phase 4：增强功能

- [ ] 会话录制与回放
- [ ] 命令片段管理
- [ ] 多窗口支持
- [ ] 主题系统完善（亮色 / 自定义主题）

### Future：协议扩展与生态

- [ ] 串口连接（serialport）
- [ ] RDP 远程桌面
- [ ] WebDAV 配置同步（设置 / 连接跨设备同步）
- [ ] Plugin 系统（AI 补全 / 分析）

---

## 6. 项目结构

```text
zTerm/
├── docs/
│   ├── project-plan.md
│   ├── handoff.md
│   └── superpowers/
├── src/
│   ├── main/
│   │   ├── main.ts
│   │   ├── services/
│   │   │   ├── pty.service.ts
│   │   │   └── store.service.ts
│   │   └── ipc/
│   │       ├── terminal.ipc.ts
│   │       └── store.ipc.ts
│   ├── preload/
│   │   └── index.ts
│   ├── renderer/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── env.d.ts
│   │   ├── components/
│   │   │   ├── workbench/
│   │   │   ├── terminal/
│   │   │   └── sidebar/
│   │   ├── stores/
│   │   │   ├── workbench.store.ts
│   │   │   ├── terminal.store.ts
│   │   │   └── connections.store.ts
│   │   ├── utils/
│   │   │   └── theme.ts
│   │   └── styles/
│   │       ├── global.css
│   │       ├── workbench.css
│   │       ├── terminal.css
│   │       └── sidebar.css
│   └── shared/
│       ├── config/
│       │   ├── theme.config.ts
│       │   ├── layout.config.ts
│       │   └── shell.config.ts
│       ├── ipc-channels.ts
│       └── types/
│           ├── terminal.ts
│           ├── services.ts
│           └── store.ts
├── eslint.config.js
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.web.json
├── electron.vite.config.ts
├── package.json
└── README.md
```

---

## 7. 开发环境

- **Node.js**：22（`nvm use 22`）
- **包管理**：npm
- **主开发平台**：macOS
- **启动命令**：`npm run dev`
- **macOS 注意**：首次安装后需确保 `node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper` 有执行权限

---

## 8. 关键技术决策记录

| 决策 | 选择 | 原因 |
|------|------|------|
| 不基于 VS Code 二次开发 | 全新实现，以 VS Code 为参考 | 避免继承 VS Code 的复杂历史包袱 |
| UI 技术栈 | React + TypeScript | 开发效率高，适合当前规模 |
| 终端实现 | xterm.js + node-pty | 业界成熟组合，VS Code 已验证 |
| 状态管理 | Zustand | 轻量、简单、TypeScript 友好 |
| 主题系统 | JS 注入 CSS 变量 | 为未来主题切换预留能力 |
| WebGL 渲染 | 启用，失败自动 fallback | 在兼容性和性能之间取平衡 |
| 持久化 | electron-store | 简单直接，足够支撑设置和连接数据 |
| 凭据安全 | safeStorage（Phase 2 接入） | 借助系统级密钥链能力 |
| 服务解耦 | `ITerminalService` | 为 SSH / DI 做准备，避免 IPC 直接耦合到 PtyService |
| login shell | 默认开启 | 避免 PATH 等 shell 环境缺失 |
| Sidebar 宽度控制 | Zustand + inline style | 比纯 CSS 变量更直接、稳定 |
| theme 变量映射 | `camelCase -> --kebab-case` | UI 主题与终端主题共享统一配置来源 |

---

## 9. 参考资源

- VS Code 源码：`/Users/huyuanzhe/prj-code/vscode`
  - 终端：`src/vs/workbench/contrib/terminal/`
  - sash：`src/vs/base/browser/ui/sash/sash.ts`
  - 布局：`src/vs/workbench/browser/layout.ts`
- xterm.js：<https://xtermjs.org/>
- node-pty：<https://github.com/microsoft/node-pty>
- ssh2：<https://github.com/mscdex/ssh2>
- electron-vite：<https://electron-vite.org/>
