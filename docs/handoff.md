# zTerm 开发交接文档

> 本文档用于在全新对话上下文中快速恢复开发状态。读完本文后可直接继续 zTerm 的开发工作，无需翻阅历史记录。

---

## 项目基本信息

- **仓库路径**: `/Users/huyuanzhe/prj-code/zTerm`
- **VS Code 参考源码**: `/Users/huyuanzhe/prj-code/vscode`（只读参照，不 fork）
- **平台**: macOS（主力开发），Windows 待验证
- **Node.js**: 22（`nvm use 22`，`.nvmrc` 已配置）
- **包管理**: npm（不用 pnpm）
- **启动**: `npm run dev`

---

## 当前完成状态（Phase 1 基本完成）

### 已实现

| 功能 | 状态 |
|------|------|
| Electron + React workbench 骨架 | ✅ |
| VS Code Dark+ 主题（精确色值，CSS 变量） | ✅ |
| Activity Bar（codicons 图标，点击切换/折叠 sidebar） | ✅ |
| Sidebar 可折叠/展开（点击活动栏已激活项切换） | ✅ |
| Sidebar 拖拽调宽（Sash，范围 170–500px，<120px 自动隐藏） | ✅ |
| Sidebar 连接树（Local Terminal 固定项，文件夹结构） | ✅ |
| 多 tab 终端（新建、关闭、切换） | ✅ |
| Tab 栏溢出横向滚动（鼠标滚轮 + 滚动条 hover 显示） | ✅ |
| 切换 tab 自动滚动到可见区域（getBoundingClientRect） | ✅ |
| xterm.js 本地终端（login shell，xterm-256color） | ✅ |
| node-pty PTY 管理（spawn/write/resize/kill） | ✅ |
| 辅助侧栏（Auxiliary Sidebar，空白占位） | ✅ |

### 未实现（Phase 1 剩余）

- 终端分屏（水平/垂直）
- 基础设置页面（字体、shell 路径、是否 login shell）
- 快捷键系统

### 下一阶段（Phase 2）

- 新建连接弹窗（选择 Local / SSH 类型）
- SSH 连接实现（ssh2 库，主进程 SshService）
- 连接保存与持久化（connections store 目前只在内存中）

---

## 项目结构

```
src/
├── main/
│   ├── main.ts                  # BrowserWindow，titleBarStyle: hiddenInset，注册 IPC
│   ├── services/pty.service.ts  # PtyService：spawn/write/resize/kill/dispose
│   └── ipc/terminal.ipc.ts     # 注册 terminal:* IPC handlers
├── preload/index.ts             # contextBridge → window.terminalApi
├── renderer/
│   ├── components/
│   │   ├── workbench/
│   │   │   ├── Workbench.tsx        # CSS Grid 4 列，inline style 控制 sidebarWidth
│   │   │   ├── TitleBar.tsx         # 标题居中，-webkit-app-region: drag
│   │   │   ├── ActivityBar.tsx      # 读 workbench store，setActiveView 触发 toggle
│   │   │   ├── Sidebar.tsx          # 含标题栏 + 新建按钮 + ConnectionTree
│   │   │   ├── Sash.tsx             # 拖拽调宽，active class 保持高亮
│   │   │   ├── AuxiliarySidebar.tsx # 空白占位
│   │   │   ├── MainArea.tsx         # TerminalTabs + TerminalPanel
│   │   │   └── StatusBar.tsx        # 左右分区，codicon 图标
│   │   ├── terminal/
│   │   │   ├── TerminalTabs.tsx     # Tab 栏，scroll container + actions 分离，自动滚动
│   │   │   ├── TerminalPanel.tsx    # 监听 zterm:new-terminal 事件，管理 TerminalInstance 生命周期
│   │   │   └── TerminalInstance.tsx # xterm.js 实例，先注册 onData 再 create PTY（避免竞态）
│   │   └── sidebar/
│   │       └── ConnectionTree.tsx   # 固定 Local Terminal 项 + 递归渲染文件夹/连接
│   ├── stores/
│   │   ├── workbench.store.ts   # sidebarVisible / sidebarWidth / activeViewId
│   │   ├── terminal.store.ts    # tabs[] / activeTabId / addTab / removeTab / setActiveTab
│   │   └── connections.store.ts # folders[]（ConnectionFolder 树） / addFolder / toggleFolder
│   ├── styles/
│   │   ├── global.css           # @import codicons；CSS 变量（VS Code Dark+）；scrollbar
│   │   ├── workbench.css        # grid 布局；activitybar；sidebar；sash；statusbar
│   │   ├── terminal.css         # tab 栏（scroll + actions 分离）；terminal panel
│   │   └── sidebar.css          # 树节点（22px 行高，缩进，hover）
│   └── env.d.ts                 # Window.terminalApi 类型；*.css 模块声明
└── shared/
    ├── ipc-channels.ts          # TERMINAL_CREATE/WRITE/RESIZE/KILL/DATA/EXIT
    └── types/terminal.ts        # IShellOptions / ITerminalData / ITerminalExit
```

---

## 关键实现细节

### 新建终端流程

```
用户操作（点击 + / "Local Terminal" / sidebar 按钮）
  → window.dispatchEvent(new CustomEvent('zterm:new-terminal'))
  → TerminalPanel.createTerminal()
      → addTab(tempId)  // tempId = -Date.now()（负数占位）
  → TerminalInstance 挂载
      → 先注册 window.terminalApi.onData()   ← 关键：避免竞态丢失初始输出
      → 再调用 window.terminalApi.create({cols, rows})
      → 返回真实 ptyId，绑定 onData/onResize/onExit
```

### Sidebar 折叠/调宽

- `workbench.store.ts` 的 `setActiveView(id)`:
  - 若 `id === activeViewId` 且 sidebar 可见 → 隐藏
  - 否则 → 展开并切换视图
- `setSidebarWidth(width)`:
  - `width < 120` → 自动隐藏
  - 否则 → clamp 到 `[170, 500]`
- `Workbench.tsx` 通过 inline style `gridTemplateColumns` 动态控制宽度，不依赖 CSS 变量

### Sash 拖拽高亮

- mousedown 时设 `useState(active=true)` + `sash--active` class（蓝色常亮）
- mouseup 时清除，避免拖拽时鼠标移出 4px 区域导致 `:hover` 丢失的闪烁问题

### Tab 滚动定位

- 用 `getBoundingClientRect()` 而非 `offsetLeft`，因为 flex 容器不是 `offsetParent`，`offsetLeft` 参照系不一致
- `tabRelLeft < 0` → 向左滚；`tabRelRight > containerWidth` → 向右滚，只滚最小必要距离

### macOS 特殊问题

- `node-pty` 的 `spawn-helper` 二进制默认无执行权限：`chmod +x node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper`
- Shell 必须以 login shell 启动（`spawn(shell, ['-l'])`）否则缺少用户 PATH
- Electron 不能从 Bash/无头环境启动（`electron.app` 为 undefined），必须手动 `npm run dev`

### TypeScript 配置

- `tsconfig.json`（基础）设置了 `jsx: react-jsx` 和 `lib: [..., DOM]`，使 IDE 能正确识别渲染进程 tsx 文件
- `tsconfig.web.json` 继承基础配置，专供渲染进程
- `tsconfig.node.json` 继承基础配置，专供主进程
- CSS 副作用导入通过 `env.d.ts` 的 `declare module '*.css'` 消除 TS 报错

---

## CSS 变量速查

```css
/* 尺寸 */
--titlebar-height: 38px
--activitybar-width: 48px
--statusbar-height: 22px
--sidebar-width: 240px        /* 初始值，运行时由 JS inline style 覆盖 */
--auxiliarybar-width: 240px

/* 背景色 */
--bg-titlebar: #3c3c3c
--bg-activitybar: #333333
--bg-editor: #1e1e1e
--bg-sidebar: #252526
--bg-tabs-container: #252526
--bg-tab-active: #1e1e1e
--bg-tab-inactive: #2d2d2d
--bg-statusbar: #007acc

/* 前景色 */
--fg-editor: #d4d4d4
--fg-sidebar: #cccccc
--fg-sidebar-title: #bbbbbb
--fg-tab-active: #ffffff
--fg-tab-inactive: rgba(255, 255, 255, 0.5)
--fg-statusbar: #ffffff
--activitybar-fg-active: #ffffff
--activitybar-fg-inactive: rgba(255, 255, 255, 0.4)

/* 其他 */
--border-color: #414141
--bg-hover: rgba(90, 93, 94, 0.31)
--focus-border: #007fd4
--tab-active-border-top: #007acc
```

---

## IPC Channels

```typescript
// src/shared/ipc-channels.ts
TERMINAL_CREATE  // invoke: (IShellOptions) → number (ptyId)
TERMINAL_WRITE   // send:   { id, data }
TERMINAL_RESIZE  // send:   { id, cols, rows }
TERMINAL_KILL    // send:   { id }
TERMINAL_DATA    // on:     { id, data }     ← main → renderer
TERMINAL_EXIT    // on:     { id, code }     ← main → renderer
```

---

## 下一步工作建议

### 立即可做：新建连接弹窗

当前 sidebar 的 `+` 按钮和 "Local Terminal" 点击都直接触发 `zterm:new-terminal`。下一步改为弹出选择弹窗：

1. 新建 `src/renderer/components/dialogs/NewConnectionDialog.tsx`
2. 弹窗内提供选项：**Local Terminal** / **SSH Connection**（后续添加）
3. 选择 Local → 触发 `zterm:new-terminal`；选择 SSH → 展开 SSH 配置表单

### 紧接着：SSH 实现

1. 主进程新建 `src/main/services/ssh.service.ts`（用 ssh2 库）
2. 新建 `src/main/ipc/ssh.ipc.ts`，注册 `ssh:connect / ssh:write / ssh:resize / ssh:disconnect` channels
3. Preload 扩展 `window.sshApi`
4. connections store 加 `addConnection(item: ConnectionItem)` 并持久化（写文件或用 electron-store）
5. TerminalInstance 根据 tab 类型决定用 `terminalApi` 还是 `sshApi`

### 后续：连接持久化

connections store 目前只在内存中，重启后丢失。可用 `electron-store` 或直接写 JSON 文件到 `app.getPath('userData')` 实现持久化。

---

## 开发注意事项

1. 所有文档放 `docs/`，README 在根目录
2. 用 npm，不用 pnpm
3. 图标统一用 `@vscode/codicons`，使用方式：`<i className="codicon codicon-xxx" />`，activity bar 的图标需要 `font-size: 24px !important` 覆盖 codicon 默认的 16px
4. Electron 无法从 Claude 的 Bash 工具启动，需要用户手动在终端运行 `npm run dev`
5. 参照 VS Code 实现时优先看 `/Users/huyuanzhe/prj-code/vscode/src/vs/` 对应模块，不直接复用代码
