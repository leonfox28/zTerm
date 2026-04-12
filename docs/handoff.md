# zTerm 开发交接文档

> **单一恢复入口**：在新的 Claude 上下文中，默认只需要先读取这一个文件，就可以继续开发。除非这里明确指出需要补充背景，否则不必先读其他文档。

---

## 0. VS Code 参考源码

**路径**：`/Users/huyuanzhe/prj-code/vscode`

**核心原则**：zTerm 所有 UI 组件、交互行为、主题 token 的实现，都应参考本地 VS Code 源码中的对应模块。不是直接照搬 VS Code 的整套框架，而是理解其设计思路后，用 zTerm 当前技术栈（React + Zustand + CSS variables）做轻量版实现。

**常用参考路径**：
- 终端：`src/vs/workbench/contrib/terminal/browser/`
  - `terminalContextMenu.ts` — 终端右键菜单触发
  - `terminalTabbedView.ts` — 终端 tab/pane 视图管理、sash 拖拽生命周期
  - `terminalResizeDebouncer.ts` — 终端 resize 策略
  - `terminalInstance.ts` — 终端实例管理
- 菜单：
  - `src/vs/platform/contextview/browser/contextMenuService.ts` — 共享菜单渲染层
  - `src/vs/platform/theme/common/colors/menuColors.ts` — 菜单 theme token 定义
- 通用 UI：
  - `src/vs/base/browser/ui/sash/sash.ts` — Sash 拖拽交互
- 布局：`src/vs/workbench/browser/layout.ts`

**怎么参考**：
1. 先在 VS Code 源码中找到对应模块，理解其分层和关键 token
2. 提炼出对 zTerm 有用的设计思路（不搬运 VS Code 的 DI/contextKey/menuService 全家桶）
3. 用 zTerm 的 React + Zustand + CSS variable 体系做轻量实现
4. 视觉上尽量对齐 VS Code Dark+ 主题的观感

---

## 1. 当前状态

- **仓库路径**：`/Users/huyuanzhe/prj-code/zTerm`
- **当前主分支**：`main`
- **历史 worktree 状态**：`phase-1-5` 已经合并回 `main`，旧 worktree 已移除
- **当前阶段**：Phase 1 + Phase 1.5 完成，分屏 + 右键菜单（含 VS Code 视觉对齐）已完成并提交
- **建议下一步优先级**：
  1. 基础设置页（字体、shell 路径、login shell 开关、主题）
  2. 快捷键系统
  3. SSH 连接管理
- **默认协作约束**：
  - 用中文回复
  - 使用 npm，不用 pnpm
  - Electron GUI 由用户手动运行 `npm run dev` 验证，不要尝试通过 Bash 做无头 GUI 验证
  - Claude 负责设计/规划/审查，Codex 负责写代码（通过 `/ask codex` 调用）

---

## 2. 当前已经完成的内容

### 已完成

| 功能 / 工作项 | 状态 |
|---|---|
| Electron + React workbench 骨架 | ✅ |
| VS Code Dark+ 风格界面 | ✅ |
| Activity Bar / Sidebar / Status Bar / Title Bar 基础布局 | ✅ |
| Sidebar 折叠 / 拖拽调宽 | ✅ |
| ConnectionTree 基础结构 | ✅ |
| 多 tab 本地终端 | ✅ |
| xterm.js + node-pty 本地终端链路 | ✅ |
| WebGL 渲染 + canvas fallback | ✅ |
| 主题 / 布局 / shell 配置抽取 | ✅ |
| `ITerminalService` 抽象 | ✅ |
| `electron-store` 持久化接入 | ✅ |
| `window.storeApi` preload 暴露 | ✅ |
| connections folder 持久化初始化 | ✅ |
| ESLint v9 flat config | ✅ |
| Phase 1.5 运行时收尾修复 | ✅ |
| **终端分屏**（水平/垂直 split、pane resize、pane focus） | ✅ |
| **Pane 关闭**（closePane + 树折叠 + activePaneId 恢复） | ✅ |
| **共享右键菜单层**（可复用 context menu host + terminal pane 第一个 consumer） | ✅ |
| **菜单 theme token**（menuBackground/Foreground/Selection/Border/Separator） | ✅ |
| **右键菜单视觉对齐 VS Code**（圆角 8px、项圆角 6px、hover `#0078d4`、淡入动画、尺寸对齐） | ✅ |
| **菜单去除图标**（纯文字菜单，无 icon 列） | ✅ |
| **关闭分屏后 refit**（closePane 后通过 `zterm:split-resize-end` 事件强制剩余终端 refit） | ✅ |

### 下一步

1. **基础设置页**（字体、shell 路径、login shell 开关、主题）
2. **快捷键系统**
3. **SSH 连接管理**

---

## 3. 本轮必须记住的运行时修复

这些点已经踩过坑，后续不要回退。

### 3.1 `electron-store` 构造兼容修复

- **文件**：`src/main/services/store.service.ts`
- **问题现象**：主进程启动时报 `TypeError: Store is not a constructor`
- **必须保留的写法**：

```ts
const Store = (
  ElectronStoreModule as typeof ElectronStoreModule & { default?: typeof ElectronStoreModule }
).default ?? ElectronStoreModule
```

### 3.2 CSS 变量名映射修复

- **文件**：`src/renderer/utils/theme.ts`
- **必须保留的写法**：

```ts
function toCssVar(key: string): string {
  return '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase()
}
```

---

## 4. 当前架构速览

### Main 侧

- `src/main/main.ts` — BrowserWindow + IPC 注册
- `src/main/services/pty.service.ts` — 本地 PTY 管理
- `src/main/services/store.service.ts` — electron-store 封装
- `src/main/ipc/terminal.ipc.ts` — terminal IPC handler
- `src/main/ipc/store.ipc.ts` — store IPC handler

### Preload 侧

- `src/preload/index.ts` — 暴露 `window.terminalApi` + `window.storeApi`

### Renderer 侧

- `src/renderer/components/workbench/` — Workbench、TitleBar、ActivityBar、Sidebar、Sash、MainArea、AuxiliarySidebar、StatusBar
- `src/renderer/components/terminal/`
  - `TerminalTabs.tsx` — tab 栏（new tab / split / tab 切换 / close）
  - `TerminalPanel.tsx` — tab 内容容器，每个 tab 渲染一个 TerminalPaneTree
  - `TerminalPaneTree.tsx` — pane 树布局，叶子 pane 渲染 TerminalInstance，split 节点渲染 TerminalSplitSash
  - `TerminalSplitSash.tsx` — 分屏拖拽条，带 drag start/move/end 生命周期
  - `TerminalInstance.tsx` — 单个 xterm.js 终端实例，管理 PTY 生命周期、fit、WebGL
- `src/renderer/components/context-menu/`
  - `ContextMenuHost.tsx` — **共享右键菜单 host**，挂在 Workbench 高层，负责渲染、viewport clamp、outside click / Esc 关闭
- `src/renderer/components/sidebar/ConnectionTree.tsx` — 连接树 UI
- `src/renderer/stores/`
  - `workbench.store.ts` — sidebar 状态
  - `terminal.store.ts` — tab/pane/session/split 树模型 + addTab/removeTab/splitPane/closePane/resizeSplit
  - `connections.store.ts` — 连接数据持久化
  - `context-menu.store.ts` — **共享菜单 zustand store**（open/close + anchor + items）
- `src/renderer/utils/theme.ts` — 运行时主题变量注入
- `src/renderer/styles/`
  - `global.css` — 布局尺寸变量 + codicons
  - `workbench.css` — workbench grid + 各布局组件样式
  - `terminal.css` — tab 栏 + terminal panel + pane tree + split sash 样式
  - `sidebar.css` — 连接树
  - `context-menu.css` — **共享菜单样式**（使用通用 menu theme token）

### Shared 侧

- `src/shared/config/theme.config.ts` — ITheme 接口 + darkPlusTheme（含 menu token）
- `src/shared/config/layout.config.ts` / `shell.config.ts`
- `src/shared/types/services.ts` / `store.ts` / `terminal.ts`
- `src/shared/ipc-channels.ts`

---

## 5. 关键实现细节

### 5.1 新建终端链路

```text
用户操作 → dispatchEvent('zterm:new-terminal') → TerminalPanel 创建 tab → TerminalInstance 挂载 → 先注册 onData/onExit → 再调用 terminalApi.create() → main 侧 PtyService.spawn()
```

**关键**：一定要先注册数据监听，再创建 PTY，否则会丢初始输出。

### 5.2 分屏系统

- **状态模型**：`terminal.store.ts` 中 tab 有 `rootPaneId` + `activePaneId`，pane 有两种类型：`TerminalLeafPane`（叶子，包含 sessionId）和 `TerminalSplitPane`（分支，包含 direction + children + ratios）
- **布局算法**：`TerminalPaneTree.tsx` 的 `buildLayouts()` 递归遍历 pane 树，计算每个叶子的百分比矩形，用 `position: absolute` + 百分比定位
- **split 操作**：`splitPane()` 将目标叶子替换为新 split 节点，子节点是原叶子 + 新叶子
- **close 操作**：`closePane()` 删除目标叶子和其父 split，兄弟节点提升；如果是 tab 唯一 pane 则整个 tab 关闭
- **resize 拖拽**：`TerminalSplitSash` 在 mousedown/mousemove/mouseup 中计算新 ratio 并调用 `resizeSplit()`
- **拖拽防闪烁**：`TerminalSplitSash` 在 drag start/end 时发 `zterm:split-resize-start/end` window 事件 + `body.dataset.ztermSplitDragging`；`TerminalInstance` 的 ResizeObserver 在 dragging 期间跳过 fit，drag end 时做一次统一 fit

### 5.3 共享右键菜单

- **store**：`context-menu.store.ts` — zustand store 保存一个 `menu: { anchor, items } | null`，提供 `openContextMenu()` / `closeContextMenu()`
- **item 模型**：`ContextMenuActionItem`（type='action', label, onSelect, disabled?）+ `ContextMenuSeparatorItem`（type='separator'）
- **host**：`ContextMenuHost.tsx` 挂在 `Workbench.tsx` 高层，负责：
  - 渲染菜单 DOM（`position: fixed`），纯文字无图标
  - `useLayoutEffect` 测量菜单尺寸后做 viewport clamp
  - outside click（`pointerdown`）关闭
  - `Esc` 关闭
  - item click 后关闭
- **consumer 接入方式**：在 `onContextMenu` 里直接调用 `openContextMenu({ anchor: { x, y }, items: [...] })`
- **terminal pane 接入**：`TerminalPaneTree.tsx` 在 pane 右键时：先 `setActivePane()`，再 `openContextMenu()` 传入 Close Terminal action；close 后通过 `requestAnimationFrame` + `zterm:split-resize-end` 事件强制剩余终端 refit
- **VS Code 视觉对齐**：
  - 容器：`border-radius: 8px`、`min-width: 160px`、`padding: 4px 0`、`fadeIn 0.083s` 动画
  - 菜单项：`height: 24px`、`margin: 0 4px`、`border-radius: 6px`（hover 不贴边）
  - hover 颜色：`#0078d4`（VS Code 标准蓝）
  - 分隔线：`border-bottom: 1px solid #454545`、`margin: 5px 0`
- **样式**：`context-menu.css` 使用通用 `--menu-background`、`--menu-foreground`、`--menu-selection-background` 等 CSS 变量

### 5.4 主题系统

- 主题源：`src/shared/config/theme.config.ts`（ITheme 接口 + darkPlusTheme 值）
- 启动入口：`src/renderer/main.tsx`
- 注入函数：`src/renderer/utils/theme.ts` 的 `applyTheme()` 遍历 theme 对象，用 `toCssVar()` 转换 key 为 CSS 变量名
- CSS 消费：`var(--bg-editor)` / `var(--menu-background)` 等
- menu token：`menuBackground`、`menuForeground`、`menuSelectionBackground`、`menuSelectionForeground`、`menuBorder`、`menuSeparatorBackground`

### 5.5 WebGL 渲染

- `TerminalInstance.tsx` 在 `term.open()` 后尝试加载 `@xterm/addon-webgl`
- WebGL 不可用时自动 fallback 到 canvas
- 已处理 `onContextLoss()`

### 5.6 持久化

- `settings`、`connections`、`connectionFolders` schema 已存在
- 目前真正接上的主要是 `connectionFolders`
- **当前限制**：还没有完整落地 SSH 连接项与嵌套 connection 数据的持久化闭环

### 5.7 Sidebar 宽度规则

- `< 120px` 自动隐藏，否则 clamp 到 `170–500px`

---

## 6. 当前验证状态

### 已验证通过

- `npm run lint`（通过）
- `npx tsc --noEmit`（通过）
- 用户手动验证：
  - Electron 窗口可打开
  - 本地终端可工作
  - 分屏正常
  - 右键菜单功能正常、视觉对齐 VS Code
  - 非终端区域主题正常

### 当前非阻塞项

- `[MODULE_TYPELESS_PACKAGE_JSON]` warning（`eslint.config.js` 用 ESM 写法但 `package.json` 没声明 `"type": "module"`），不影响开发

---

## 7. 建议的下一步

### 7.1 基础设置页

需要实现一个设置页面，允许用户配置：
- 终端字体 / 字号
- Shell 路径
- Login shell 开关
- 主题选择

### 7.2 快捷键系统

### 7.3 SSH 连接管理

---

## 8. 新上下文中该怎么开始

### 最简提示词

```text
请先读取 docs/handoff.md，并基于其中内容直接继续开发。
```

### 指定任务

```text
请先读取 docs/handoff.md，实现基础设置页。
```

### 对新的 Claude 的期望行为

读取本文后，应该：

1. 以 `docs/handoff.md` 为当前入口
2. 默认认为当前开发目录就是 `/Users/huyuanzhe/prj-code/zTerm`
3. 所有 UI 实现参考本地 VS Code 源码（路径见第 0 节）
4. Claude 负责设计/规划/审查，Codex 负责写代码
5. 只有在需要补充背景时，才继续读取 `docs/project-plan.md` 或 `README.md`

---

## 9. 开发注意事项

1. **VS Code 参考**：所有 UI 实现都参考本地 VS Code 源码（`/Users/huyuanzhe/prj-code/vscode`），理解思路后做轻量实现
2. **文档位置**：除 `README.md` 外，其余项目文档都放 `docs/`
3. **包管理器**：使用 npm
4. **GUI 验证**：Electron 需要用户手动运行 `npm run dev`
5. **代码真相来源**：以 `src/` 为准
6. **协作模式**：Claude 设计 + Codex 写代码
7. **继续改 store/theme 时**：优先保留运行时修复（第 3 节）
8. **不要再引用旧 worktree 路径**：它已经被合并并移除了

---

## 10. 需要更多背景时再读哪些文件

只有当本文信息不够时，再按下面顺序补读：

1. `docs/project-plan.md`
2. `README.md`
3. 具体相关源码文件
