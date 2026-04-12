# zTerm 开发交接文档

> **单一恢复入口**：在新的 Claude 上下文中，默认只需要先读取这一个文件，就可以继续开发。除非这里明确指出需要补充背景，否则不必先读其他文档。

---

## 1. 当前状态

- **仓库路径**：`/Users/huyuanzhe/prj-code/zTerm`
- **当前主分支**：`main`
- **历史 worktree 状态**：`phase-1-5` 已经合并回 `main`，旧 worktree 已移除，不要再使用 `.worktrees/phase-1-5` 路径
- **当前阶段**：Phase 1 基本完成，**Phase 1.5 已完成并已合并**
- **建议下一步优先级**：
  1. 终端分屏
  2. 基础设置页
  3. 快捷键系统
- **默认协作约束**：
  - 用中文回复
  - 使用 npm，不用 pnpm
  - Electron GUI 由用户手动运行 `npm run dev` 验证，不要尝试通过 Bash 做无头 GUI 验证

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
| 文档整理与交接文档收敛 | ✅ |
| Phase 1.5 运行时收尾修复 | ✅ |

### 还没做的核心功能

1. **终端分屏**（水平 / 垂直）
2. **基础设置页**（字体、shell 路径、login shell 开关、主题）
3. **快捷键系统**

---

## 3. 本轮必须记住的两个运行时修复

这两个点已经踩过坑，后续不要回退。

### 3.1 `electron-store` 构造兼容修复

- **文件**：`src/main/services/store.service.ts`
- **问题现象**：主进程启动时报 `TypeError: Store is not a constructor`
- **根因**：`electron-store` 是 ESM 包，当前 main 侧构建产物按 CommonJS 方式消费时，直接拿默认导出会拿到模块对象
- **必须保留的写法**：

```ts
const Store = (
  ElectronStoreModule as typeof ElectronStoreModule & { default?: typeof ElectronStoreModule }
).default ?? ElectronStoreModule
```

- **结论**：后续改 `StoreService` 时，不要把这里退回成直接 `new Store()` 的简单写法，除非你同时改了构建与模块消费方式。

### 3.2 CSS 变量名映射修复

- **文件**：`src/renderer/utils/theme.ts`
- **问题现象**：终端区域正常，但 workbench 其它区域变成白底
- **根因**：`toCssVar()` 以前把大写字母替换成了 `'-'`，却没把字母本身保留下来，导致：
  - `bgEditor -> --bg-ditor`
  - `bgTitlebar -> --bg-itlebar`
- **必须保留的写法**：

```ts
function toCssVar(key: string): string {
  return '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase()
}
```

- **结论**：如果后续继续扩展主题系统，保持 `camelCase -> --kebab-case` 的转换规则不变。

---

## 4. 当前架构速览

### Main 侧

- `src/main/main.ts`
  - 创建 `BrowserWindow`
  - 注册 terminal/store IPC
- `src/main/services/pty.service.ts`
  - 本地 PTY 管理
  - 实现 `ITerminalService`
- `src/main/services/store.service.ts`
  - `electron-store` 封装
- `src/main/ipc/terminal.ipc.ts`
  - terminal 相关 IPC handler
- `src/main/ipc/store.ipc.ts`
  - store 相关 IPC handler

### Preload 侧

- `src/preload/index.ts`
  - 暴露 `window.terminalApi`
  - 暴露 `window.storeApi`

### Renderer 侧

- `src/renderer/components/workbench/`
  - Workbench、TitleBar、ActivityBar、Sidebar、Sash、MainArea、StatusBar 等布局组件
- `src/renderer/components/terminal/`
  - `TerminalTabs.tsx`
  - `TerminalPanel.tsx`
  - `TerminalInstance.tsx`
- `src/renderer/components/sidebar/ConnectionTree.tsx`
  - 当前连接树 UI
- `src/renderer/stores/`
  - `workbench.store.ts`
  - `terminal.store.ts`
  - `connections.store.ts`
- `src/renderer/utils/theme.ts`
  - 运行时主题变量注入

### Shared 侧

- `src/shared/config/theme.config.ts`
- `src/shared/config/layout.config.ts`
- `src/shared/config/shell.config.ts`
- `src/shared/types/services.ts`
- `src/shared/types/store.ts`
- `src/shared/ipc-channels.ts`

---

## 5. 关键实现细节

### 5.1 新建终端链路

```text
用户操作
  → dispatchEvent('zterm:new-terminal')
  → TerminalPanel 创建 tab
  → TerminalInstance 挂载
  → 先注册 onData / onExit
  → 再调用 window.terminalApi.create()
  → main 侧 PtyService.spawn()
```

**关键点**：一定要先注册数据监听，再创建 PTY，否则会丢初始输出。

### 5.2 主题系统

- 主题源：`src/shared/config/theme.config.ts`
- 启动入口：`src/renderer/main.tsx`
- 注入函数：`src/renderer/utils/theme.ts`
- CSS 使用方式：`var(--bg-editor)`、`var(--bg-sidebar)`、`var(--fg-editor)` 等
- `global.css` 目前只保留布局尺寸变量，颜色变量依赖 JS 注入

### 5.3 WebGL 渲染

- `TerminalInstance.tsx` 在 `term.open()` 后尝试加载 `@xterm/addon-webgl`
- WebGL 不可用时自动 fallback 到 canvas
- 已处理 `onContextLoss()`

### 5.4 持久化

- `settings`、`connections`、`connectionFolders` schema 已存在
- 目前真正接上的主要是 `connectionFolders`
- `connections.store.ts` 启动时会 `init()`，从 `window.storeApi` 读取持久化 folder 数据
- **当前限制**：还没有完整落地 SSH 连接项与嵌套 connection 数据的持久化闭环

### 5.5 Sidebar 宽度规则

- 配置来源：`src/shared/config/layout.config.ts`
- store：`src/renderer/stores/workbench.store.ts`
- 规则：
  - `< 120px` 自动隐藏
  - 否则 clamp 到 `170–500px`

---

## 6. 当前验证状态

### 已验证通过

- `npm run lint`（通过，0 error / 2 warning）
- 用户手动验证：
  - Electron 窗口可打开
  - 本地终端可工作
  - 非终端区域主题已恢复正常

### 当前待修复项

- `npx tsc --noEmit` 当前失败，**下次会话开始时优先修复**：
  - `src/renderer/stores/connections.store.ts`
    - line 49：参数 `f` 隐式推断为 `any`
    - line 56：参数 `max` 隐式推断为 `any`
    - line 56：参数 `f` 隐式推断为 `any`
- 这个问题不是本次文档改动引入，但会影响后续“验证通过”的判断；继续功能开发前建议先补齐这些类型。

### 当前非阻塞项

`npm run lint` 当前仍有 **2 个 warning**，但不阻塞开发：

1. `src/renderer/stores/connections.store.ts`
   - `StoredConnectionItem` 未使用
2. `src/shared/types/store.ts`
   - `IShellOptions` 未使用

另有一个非阻塞 warning：

- `[MODULE_TYPELESS_PACKAGE_JSON]`
- 原因：`eslint.config.js` 用的是 ESM 写法，而 `package.json` 没有声明 `"type": "module"`
- 当前不影响 lint 或开发流程

---

## 7. 建议的下一步：终端分屏

如果没有别的临时需求，建议直接从这个功能继续。

### 建议实现顺序

1. 先明确状态模型
   - 是“一个 tab 内包含多个 pane”
   - 还是“pane 和 tab 是并列实体”
2. 先只支持本地终端分屏，不接 SSH
3. 先做最小闭环：
   - 水平 / 垂直 split
   - pane 创建
   - pane resize
   - pane focus
4. 再补：
   - pane 关闭
   - 快捷键
   - 更细的 UX

### 推荐优先查看的代码

- `src/renderer/components/terminal/TerminalPanel.tsx`
- `src/renderer/components/terminal/TerminalInstance.tsx`
- `src/renderer/stores/terminal.store.ts`
- `src/renderer/components/workbench/MainArea.tsx`

---

## 8. 新上下文中该怎么开始

### 你给新上下文的最简提示词

直接发这句就够了：

```text
请先读取 docs/handoff.md，并基于其中内容直接继续开发。
```

### 如果你想直接指定任务

可以这样发：

```text
请先读取 docs/handoff.md，并直接从“终端分屏”开始。先给出实现计划，再开始改代码。
```

或者：

```text
请先读取 docs/handoff.md，并继续做“基础设置页”。先梳理现有 settings/store/theme 链路，再给出实现计划。
```

### 对新的 Claude 的期望行为

读取本文后，应该：

1. 直接以 `docs/handoff.md` 为当前入口
2. 默认认为当前开发目录就是仓库根目录 `/Users/huyuanzhe/prj-code/zTerm`
3. 默认知道 Phase 1.5 已完成且已合并
4. 默认知道下一个优先任务是终端分屏
5. 只有在需要补充背景时，才继续读取 `docs/project-plan.md` 或 `README.md`

---

## 9. 开发注意事项

1. **文档位置**：除 `README.md` 外，其余项目文档都放 `docs/`
2. **包管理器**：使用 npm
3. **GUI 验证**：Electron 需要用户手动运行 `npm run dev`
4. **代码真相来源**：以 `src/` 为准，不要手改生成产物
5. **参考方式**：可以参考 VS Code 对应模块，但不要直接照搬
6. **继续改 store/theme 时**：优先保留这轮已经验证通过的两个运行时修复
7. **不要再引用旧 worktree 路径**：它已经被合并并移除了

---

## 10. 需要更多背景时再读哪些文件

只有当本文信息不够时，再按下面顺序补读：

1. `docs/project-plan.md`
2. `README.md`
3. 具体相关源码文件
