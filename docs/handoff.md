# zTerm 开发交接文档

> 目标：在全新对话上下文中快速恢复开发状态。新的上下文只要先读本文档，再读 `docs/project-plan.md` 和 `README.md`，就可以继续开发，不需要翻旧对话。

---

## 0. 当前结论

- **当前继续开发的目录**：`/Users/huyuanzhe/prj-code/zTerm/.worktrees/phase-1-5`
- **当前阶段**：Phase 1 基本完成，**Phase 1.5 已完成并做过运行时收尾验证**
- **本轮最后已修复的两个真实运行时问题**：
  1. `src/main/services/store.service.ts`：修复 `electron-store` 的 ESM / CommonJS 构造兼容问题，否则会报 `Store is not a constructor`
  2. `src/renderer/utils/theme.ts`：修复 `toCssVar()` 的 CSS 变量名转换错误，否则非终端区域会发白，只有终端保持黑底
- **当前没有新的阻塞性问题**：窗口可打开，非终端区域主题正常，终端可工作
- **建议下一步**：继续做 Phase 1 剩余项，优先级建议为：**终端分屏 → 基础设置页 → 快捷键系统**

---

## 1. 项目基本信息

- **仓库路径**：`/Users/huyuanzhe/prj-code/zTerm`
- **当前 worktree**：`/Users/huyuanzhe/prj-code/zTerm/.worktrees/phase-1-5`
- **VS Code 参考源码**：`/Users/huyuanzhe/prj-code/vscode`（只读参考，不 fork）
- **平台**：macOS（当前主力开发环境），Windows 尚未系统回归
- **Node.js**：22（`nvm use 22`）
- **包管理**：npm
- **启动命令**：`npm run dev`
- **重要约束**：Electron GUI 需要用户手动启动验证，不能依赖 Claude 的 Bash 做无头验证

---

## 2. 当前完成状态

### 已完成

| 功能 / 工作项 | 状态 |
|---|---|
| Electron + React workbench 骨架 | ✅ |
| VS Code Dark+ 风格主题系统 | ✅ |
| Activity Bar / Sidebar / Status Bar / Title Bar 基础布局 | ✅ |
| Sidebar 折叠 / 拖拽调宽 | ✅ |
| ConnectionTree 基础结构 | ✅ |
| 多 tab 本地终端 | ✅ |
| xterm.js + node-pty 本地终端链路 | ✅ |
| WebGL 渲染 + canvas fallback | ✅ |
| 布局/主题/shell 配置抽取 | ✅ |
| `ITerminalService` 抽象 | ✅ |
| `electron-store` 持久化接入 | ✅ |
| `window.storeApi` preload 暴露 | ✅ |
| connections folder 持久化初始化 | ✅ |
| ESLint v9 flat config | ✅ |
| README / project-plan / handoff 文档同步 | ✅ |
| 运行时收尾修复（store 构造兼容 + 主题变量映射） | ✅ |

### Phase 1 剩余事项

1. **终端分屏**（水平 / 垂直）
2. **基础设置页**（字体、shell 路径、是否 login shell、主题）
3. **快捷键系统**

### Phase 2 起点

- 新建连接弹窗
- `ssh2` 集成与 `SshService implements ITerminalService`
- `safeStorage` 凭据处理
- 连接保存 / 编辑 / 删除 / 状态管理

---

## 3. 本轮最终修复记录

### 3.1 `electron-store` 运行时报错修复

- **文件**：`src/main/services/store.service.ts`
- **现象**：`npm run dev` 时主进程报错 `TypeError: Store is not a constructor`
- **根因**：`electron-store` 是 ESM 包，而 main 构建产物是 CommonJS；直接构造默认导出会拿到模块对象而不是构造函数
- **当前正确写法**：

```ts
const Store = (
  ElectronStoreModule as typeof ElectronStoreModule & { default?: typeof ElectronStoreModule }
).default ?? ElectronStoreModule
```

- **意义**：后续如果继续改 store 层，不要把它改回直接 `new Store()` 的简单写法，除非整体构建方式也一起调整

### 3.2 主题变量注入修复

- **文件**：`src/renderer/utils/theme.ts`
- **现象**：窗口能打开，但除了终端区域外，其余 UI 都是白的
- **根因**：`toCssVar()` 把大写字母替换成了 `'-'`，但没有保留字母本身，导致：
  - `bgEditor -> --bg-ditor`
  - `bgTitlebar -> --bg-itlebar`
- **当前正确写法**：

```ts
function toCssVar(key: string): string {
  return '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase()
}
```

- **意义**：非终端 UI 的颜色依赖 `applyTheme()` 注入到 `:root` 的 CSS 变量；只要这个映射坏掉，workbench UI 就会整体退回默认白底

---

## 4. 当前项目结构（开发时优先关注）

```text
.
├── docs/
│   ├── handoff.md
│   ├── project-plan.md
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
│   │   ├── styles/
│   │   │   ├── global.css
│   │   │   ├── workbench.css
│   │   │   ├── terminal.css
│   │   │   └── sidebar.css
│   │   └── utils/
│   │       └── theme.ts
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
└── README.md
```

---

## 5. 关键实现细节

### 5.1 新建终端链路

```text
用户操作
  → dispatchEvent('zterm:new-terminal')
  → TerminalPanel 创建 tab
  → TerminalInstance 挂载
  → 先注册 onData / onExit 监听
  → 再调用 window.terminalApi.create()
  → main 侧 PtyService.spawn()
```

**关键点**：必须先注册数据监听，再创建 PTY，否则可能丢首屏输出。

### 5.2 主题系统

- 主题源：`src/shared/config/theme.config.ts`
- 注入入口：`src/renderer/main.tsx`
- 注入函数：`src/renderer/utils/theme.ts`
- CSS 颜色消费：`src/renderer/styles/global.css`、`workbench.css` 等通过 `var(--bg-editor)` / `var(--bg-sidebar)` 等取值

**关键点**：
- 颜色变量由 JS 在启动时写到 `:root`
- `global.css` 只保留布局尺寸变量
- `toCssVar()` 的 camelCase → kebab-case 映射必须保持正确

### 5.3 WebGL 渲染

- `TerminalInstance.tsx` 会在 `term.open()` 后尝试加载 `@xterm/addon-webgl`
- 不支持时自动 fallback 到 canvas
- 已做 `onContextLoss()` 处理

### 5.4 Store 持久化

- main 侧：`StoreService`
- preload：`window.storeApi.get / set / getAll`
- renderer：`connections.store.ts` 启动时 `init()`，当前已持久化 `connectionFolders`
- schema 定义在：`src/shared/types/store.ts`

### 5.5 服务抽象

- `ITerminalService` 在 `src/shared/types/services.ts`
- `PtyService` 已实现该接口
- `terminal.ipc.ts` 已依赖接口而不是具体实现
- 后续做 SSH 时可以新增 `SshService implements ITerminalService`

### 5.6 Sidebar 宽度逻辑

- 配置源：`src/shared/config/layout.config.ts`
- store：`src/renderer/stores/workbench.store.ts`
- 规则：
  - `< 120px` 自动隐藏
  - 否则 clamp 到 `170–500px`

---

## 6. 当前验证状态

### 已验证通过

- `npx tsc --noEmit`
- `npm run lint`
- 用户手动验证：
  - Electron 窗口可打开
  - 终端可工作
  - 非终端区域 Dark+ 主题恢复正常

### 当前非阻塞项

`npm run lint` 目前仍有 **2 个 warning**，未阻塞开发：

1. `src/renderer/stores/connections.store.ts`
   - `StoredConnectionItem` 未使用
2. `src/shared/types/store.ts`
   - `IShellOptions` 未使用

另外，运行 lint 时还会看到一个 Node warning：

- `[MODULE_TYPELESS_PACKAGE_JSON]`
- 原因：`eslint.config.js` 用 ESM 写法，而 `package.json` 没有设置 `"type": "module"`
- 现状：**不阻塞 lint，也不阻塞开发**

---

## 7. 下一步建议

### 优先级 1：终端分屏

建议从这里继续，因为它是当前 Phase 1 剩余里最核心、最影响终端产品形态的一项。

建议拆分：

1. 明确状态模型：tab 内多 pane，还是 pane 独立成 tab
2. 先只做本地终端分屏，不掺 SSH
3. 先做水平 / 垂直 split 的最小闭环
4. 再补 pane 聚焦、关闭、resize

### 优先级 2：基础设置页

1. 基于 `window.storeApi` 读取 / 保存 `settings`
2. 首批设置项：
   - 字体大小
   - 字体族
   - shell 路径
   - 是否 login shell
   - 主题
3. 设置保存后驱动 terminal / theme 生效

### 优先级 3：快捷键系统

1. 先做最小命令集：
   - 新建终端
   - 关闭 tab
   - 切换 tab
   - 切换 sidebar
2. 不要把快捷键逻辑散落到组件里
3. 为后续 pane / SSH 命令预留扩展点

---

## 8. 新上下文恢复方式

### 8.1 新上下文里先读这几个文件

按顺序：

1. `docs/handoff.md`
2. `docs/project-plan.md`
3. `README.md`

如果是继续 Phase 1.5 历史背景，再补读：

4. `docs/superpowers/specs/2026-04-12-project-restructure-design.md`
5. `docs/superpowers/plans/2026-04-12-project-restructure.md`

### 8.2 可以直接复制给新上下文的启动词

```text
请先阅读以下文件：
1. /Users/huyuanzhe/prj-code/zTerm/.worktrees/phase-1-5/docs/handoff.md
2. /Users/huyuanzhe/prj-code/zTerm/.worktrees/phase-1-5/docs/project-plan.md
3. /Users/huyuanzhe/prj-code/zTerm/.worktrees/phase-1-5/README.md

当前工作目录是 /Users/huyuanzhe/prj-code/zTerm/.worktrees/phase-1-5。
现在 Phase 1.5 已完成，最近已经修复两个运行时问题：
- src/main/services/store.service.ts 的 electron-store ESM/CJS 构造兼容问题
- src/renderer/utils/theme.ts 的 CSS 变量名映射问题

请基于 handoff 文档继续开发，优先从“终端分屏”开始。
先给出实现计划，再开始改代码。
默认用中文回复，使用 npm，不要尝试通过 Bash 无头启动 Electron；GUI 由我手动验证。
```

### 8.3 如果想直接继续某一项

也可以把最后一段替换成下面任一条：

- `请直接为“终端分屏”做实施计划并开始。`
- `请继续做“基础设置页”，先梳理现有 settings/store/theme 链路。`
- `请继续做“快捷键系统”，先设计命令层和注册点。`

---

## 9. 开发注意事项

1. **文档约定**：除 `README.md` 外，其余项目文档都放 `docs/`
2. **包管理器**：只用 npm
3. **GUI 验证**：Electron 需要用户自己跑 `npm run dev`
4. **参考方式**：可参考 VS Code 对应模块，但不要直接照搬
5. **source of truth**：以 `src/` 为准，不要把 `out/` 构建产物当作主要修改目标
6. **继续做 store/theme 相关工作时**，优先保留当前已经验证通过的运行时修复，不要回退
