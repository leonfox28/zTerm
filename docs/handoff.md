# zTerm 开发交接文档

> **单一恢复入口**：在新的 Claude 上下文中，默认先读取这一个文件即可继续工作。除非这里明确指出需要补充背景，否则不必先读其他文档。
>
> **当前规划主入口**：后续实现与能力约束默认以 `openspec/specs/` 为准；`openspec/changes/archive/` 作为已完成变更的历史记录；`docs/superpowers/` 仅作历史背景参考。

---

## 0. VS Code 参考源码

**路径**：`/Users/huyuanzhe/prj-code/vscode`

**核心原则**：zTerm 所有 UI 组件、交互行为、主题 token 的实现，都应参考本地 VS Code 源码中的对应模块。不是直接照搬 VS Code 的整套框架，而是理解其设计思路后，用 zTerm 当前技术栈（React + Zustand + CSS variables）做轻量版实现。

**常用参考路径**：
- 终端：`src/vs/workbench/contrib/terminal/browser/`
- 菜单：`src/vs/platform/contextview/browser/contextMenuService.ts`
- 通用 UI：`src/vs/base/browser/ui/sash/sash.ts`
- 布局：`src/vs/workbench/browser/layout.ts`

---

## 1. 当前状态

- **仓库路径**：`/Users/huyuanzhe/prj-code/zTerm`
- **当前主分支**：`main`
- **当前阶段**：
  - Phase 1 / 1.5 完成
  - SSH 连接管理相关能力已完成并归档
  - SFTP 文件树与基础传输能力已完成并归档
- **最近完成的能力**：
  - 快捷键系统
  - SSH 连接保存 / 编辑 / 删除
  - SSH 终端会话接入
  - `safeStorage` 凭据保存
  - 终端页 SSH 连接弹窗
  - 活动栏收敛为 Terminal / Settings
  - Settings 页重构为 VS Code 风格搜索 + TOC + setting rows
  - Auxiliary Sidebar 远程文件树
  - 终端 cwd 与文件树路径双向同步
  - 文件树工具栏上传 / 刷新
  - 远程文件与目录下载、详情菜单
- **默认协作约束**：
  - 用中文回复
  - 使用 npm，不用 pnpm
  - Electron GUI 由用户手动运行 `npm run dev` 验证
  - 继续参考本地 VS Code 源码实现 UI

---

## 2. 当前已经完成的内容

| 功能 / 工作项 | 状态 |
|---|---|
| Electron + React workbench 骨架 | ✅ |
| VS Code Dark+ 风格界面 | ✅ |
| Activity Bar / Sidebar / Status Bar / Title Bar 基础布局 | ✅ |
| Sidebar 折叠 / 拖拽调宽 | ✅ |
| 多 tab 本地终端 | ✅ |
| xterm.js + node-pty 本地终端链路 | ✅ |
| WebGL 渲染 + canvas fallback | ✅ |
| 主题 / 布局 / shell 配置抽取 | ✅ |
| `ITerminalService` 抽象 | ✅ |
| `electron-store` 持久化接入 | ✅ |
| 分屏系统 | ✅ |
| 共享右键菜单层 | ✅ |
| 设置页 | ✅ |
| 快捷键系统 | ✅ |
| SSH 连接保存 / 编辑 / 删除 | ✅ |
| SSH 终端会话 | ✅ |
| `safeStorage` 凭据安全存储 | ✅ |
| 终端页 SSH 连接弹窗 | ✅ |
| 连接图标按类型展示 | ✅ |
| 远程文件树工具栏（终端/文件树双向同步、上传、刷新） | ✅ |
| 文件树父目录导航行 | ✅ |
| 远程文件/目录右键下载与详情 | ✅ |
| 文件树跟随终端路径 | ✅ |

---

## 3. 当前工作台与连接交互

### 3.1 页面结构

当前工作台只保留两个主页面：
- **Terminal**
- **Settings**

其中：
- Terminal 页面保留三栏内容布局：连接侧边栏 / 终端主区 / Auxiliary Sidebar
- Settings 页面是独立主页面，内部为 VS Code 风格两栏：左侧分类 TOC，右侧设置内容

### 3.2 连接交互

- 侧边栏顶部 `New Connection` 按钮会打开 SSH 连接弹窗
- 右键已保存连接 -> `Edit Connection`，会打开同一个弹窗并回填数据
- 点击已保存 SSH 连接，会直接打开 SSH 终端 tab
- 连接失败信息只在终端中显示，不修改侧边栏连接状态
- 侧边栏图标只表达连接类型，不表达运行时状态

### 3.3 连接与凭据持久化

- `connections` 与 `connectionFolders` 都已接入持久化
- SSH 连接支持：
  - password
  - private key path
  - saved password / passphrase
- 密码类信息通过 Electron `safeStorage` 保存
- 私钥内容本身不进入连接记录，仅保存路径

---

## 4. 当前架构速览

### Main 侧

- `src/main/main.ts` — BrowserWindow + IPC 注册
- `src/main/services/pty.service.ts` — 本地 PTY 管理
- `src/main/services/ssh.service.ts` — SSH 会话管理与 shell integration cwd 上报
- `src/main/services/sftp.service.ts` — SFTP 目录读取、上传、下载、详情入口
- `src/main/services/terminal-manager.service.ts` — 统一本地/SSH 终端入口
- `src/main/services/connection.service.ts` — 连接记录与凭据处理
- `src/main/services/store.service.ts` — electron-store 封装
- `src/main/ipc/terminal.ipc.ts` — terminal IPC handler
- `src/main/ipc/sftp.ipc.ts` — SFTP IPC handler
- `src/main/ipc/store.ipc.ts` — store IPC handler
- `src/main/ipc/connection.ipc.ts` — connection IPC handler

### Preload 侧

- `src/preload/index.ts` — 暴露 `window.terminalApi` / `window.storeApi` / `window.connectionsApi` / `window.sftpApi`

### Renderer 侧

- `src/renderer/components/workbench/` — Workbench、ActivityBar、Sidebar、MainArea、StatusBar 等
- `src/renderer/components/terminal/` — TerminalTabs、TerminalPanel、TerminalPaneTree、TerminalInstance 等
- `src/renderer/components/settings/SettingsView.tsx` — Settings 页面
- `src/renderer/components/connections/SshConnectionView.tsx` — 当前承载 SSH 连接弹窗与表单
- `src/renderer/components/context-menu/ContextMenuHost.tsx` — 共享右键菜单 host
- `src/renderer/components/sidebar/ConnectionTree.tsx` — 连接树 UI
- `src/renderer/components/sidebar/RemoteFileTree.tsx` — Auxiliary Sidebar 远程文件树 UI
- `src/renderer/stores/workbench.store.ts` — 主页面、侧边栏、连接弹窗状态
- `src/renderer/stores/terminal.store.ts` — tab / pane / session 模型与最近一次 cwd 缓存
- `src/renderer/stores/settings.store.ts` — settings 初始化、持久化、主题应用
- `src/renderer/stores/connections.store.ts` — 保存连接与 folder 状态
- `src/renderer/stores/remote-files.store.ts` — 远程文件树缓存与展开状态
- `src/renderer/keybindings/useWorkbenchKeybindings.ts` — 快捷键入口

---

## 5. 当前验证状态

### 已验证通过

- `npm run lint`
- `npx tsc --noEmit`
- 用户手动验证：
  - 本地终端正常
  - 分屏正常
  - 设置页正常
  - Settings 页搜索、TOC、高保真设置行样式正常
  - SSH 连接可成功建立
  - 错误凭据场景会在终端中显示失败信息
  - SSH 新建 / 编辑弹窗交互正常
  - 活动栏已收敛为 Terminal / Settings
  - 本地 tab 显示远程文件空状态
  - SSH tab 显示远程文件树
  - 目录展开与刷新正常
  - 文件树父目录导航正常
  - 文件树右键下载 / 详情正常
  - 工具栏上传 / 刷新 / 路径同步正常
  - 文件树可跟随终端 cwd
  - SFTP 失败仅显示在 Auxiliary Sidebar

### 当前非阻塞项

- `[MODULE_TYPELESS_PACKAGE_JSON]` warning（`eslint.config.js` 用 ESM 写法但 `package.json` 没声明 `"type": "module"`），不影响开发

---

## 6. 建议的下一步

优先考虑：
1. **拖拽上传 + 传输队列 + 进度**
2. **远程文件编辑（Monaco Editor）**
3. **继续补齐 OpenSpec spec 的 Purpose 与后续能力规划**
4. **未来协议扩展（串口 / RDP 等）**

---

## 7. 新上下文中该怎么开始

### 最简提示词

```text
请先读取 docs/handoff.md，并以 openspec/specs/ 作为当前规范入口继续工作。
```

### 对新的 Claude 的期望行为

读取本文后，应该：

1. 以 `docs/handoff.md` 为当前入口
2. 默认认为当前开发目录就是 `/Users/huyuanzhe/prj-code/zTerm`
3. 所有 UI 实现继续参考本地 VS Code 源码
4. 优先阅读 `openspec/specs/` 中与当前任务相关的 spec
5. 只有在需要历史背景时，再去看 `openspec/changes/archive/` 或 `docs/project-plan.md`

---

## 8. 开发注意事项

1. **VS Code 参考**：所有 UI 实现都参考本地 VS Code 源码（`/Users/huyuanzhe/prj-code/vscode`）
2. **文档位置**：除 `README.md` 外，其余项目文档都放 `docs/`
3. **包管理器**：使用 npm
4. **GUI 验证**：Electron 需要用户手动运行 `npm run dev`
5. **代码真相来源**：以 `src/` 为准
6. **连接图标语义**：只表达连接类型，不表达运行时状态
7. **SSH 错误展示**：失败信息只在终端显示，不污染侧边栏导航语义

---

## 9. 需要更多背景时再读哪些文件

只有当本文信息不够时，再按下面顺序补读：

1. `openspec/specs/`
2. `docs/project-plan.md`
3. `README.md`
4. `openspec/changes/archive/` 下相关 change
5. 具体相关源码文件
