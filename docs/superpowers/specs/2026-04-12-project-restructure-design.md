# zTerm 项目梳理设计文档

> 历史 superpowers 文档：保留作背景参考。当前新的规划/实现主入口请看 `openspec/changes/migrate-superpowers-to-openspec/`。

> Phase 1.5: 技术债清理 + 结构化准备 + 路线图更新

---

## 1. 概述

zTerm Phase 1（本地终端）基本完成，代码量 1,468 行逻辑 + 535 行 CSS，30 个源文件。本次梳理的目标：

1. 清理技术债务（未使用代码/依赖、缺失配置）
2. 提取硬编码配置，建立主题系统骨架
3. 启用 WebGL 渲染
4. 建立服务层接口抽象，为 Phase 2 DI 做准备
5. 引入 electron-store + 凭据安全 schema
6. 重制项目路线图

**执行策略**: Claude 负责设计/规划/审查，代码编辑工作委派给 Codex 执行。

---

## 2. 技术债清理

### 2.1 删除未使用代码

| 文件 | 原因 | 操作 |
|------|------|------|
| `src/renderer/components/terminal/useTerminal.ts` | 90 行，与 TerminalInstance.tsx 重复逻辑，未被任何文件引用 | 删除 |
| `src/renderer/services/` | 空目录，无文件 | 删除 |

### 2.2 依赖处理

| 依赖 | 状态 | 操作 |
|------|------|------|
| `inversify` (^6.2.0) | 已安装未使用 | **保留**，Phase 2 启用 DI 时使用 |
| `reflect-metadata` (^0.2.2) | inversify 的依赖 | **保留**，随 inversify 一起 |
| `@xterm/addon-webgl` (^0.19.0) | 已安装未使用 | **本次启用**（见 Section 4） |

### 2.3 补全 ESLint 配置

- 创建 `eslint.config.js`（ESLint v9 flat config 格式）
- 集成 `@typescript-eslint/eslint-plugin` + `@typescript-eslint/parser`
- 启用 recommended 规则集
- 配置 React plugin (`eslint-plugin-react`, `eslint-plugin-react-hooks`)
- 配置 import 检查 (`eslint-plugin-import`)
- 确保 `npm run lint` 可正常执行
- 需安装的 devDependencies:
  - `@typescript-eslint/eslint-plugin`
  - `@typescript-eslint/parser`
  - `eslint-plugin-react`
  - `eslint-plugin-react-hooks`
  - `eslint-plugin-import`

---

## 3. 配置提取与主题系统骨架

### 3.1 目标

将所有硬编码的主题色值和布局约束集中管理，为未来主题切换功能打基础。

### 3.2 新增文件结构

```
src/shared/config/
├── theme.config.ts      # 完整主题定义（UI + 终端色值）
├── layout.config.ts     # 尺寸约束常量
└── shell.config.ts      # Shell 相关默认配置
```

### 3.3 theme.config.ts

定义 `ITheme` 接口，涵盖：

**UI 色值**（从 `global.css` CSS 变量提取）:
- 背景色: `titlebar`, `activitybar`, `editor`, `sidebar`, `tabsContainer`, `tabActive`, `tabInactive`, `statusbar`
- 前景色: `editor`, `sidebar`, `sidebarTitle`, `tabActive`, `tabInactive`, `statusbar`, `activitybarActive`, `activitybarInactive`
- 边框/交互: `border`, `hover`, `focusBorder`, `tabActiveBorderTop`

**终端色值**（从 `TerminalInstance.tsx` 提取）:
- `background`, `foreground`, `cursor`, `cursorAccent`, `selectionBackground`
- ANSI 16 色扩展（后续按需添加）

**默认主题**: `darkPlusTheme: ITheme` — 对齐当前 VS Code Dark+ 精确色值。

**运行时注入机制**:
- CSS 变量不再硬编码在 `global.css` 中
- 应用启动时由 JS 调用 `document.documentElement.style.setProperty('--bg-editor', theme.bgEditor)` 注入
- 切换主题 = 重新注入一组新的 CSS 变量值
- 创建 `applyTheme(theme: ITheme)` 工具函数处理注入，放在 `src/renderer/utils/theme.ts`

### 3.4 layout.config.ts

```typescript
export const LAYOUT = {
  titlebar: { height: 38 },
  activitybar: { width: 48 },
  statusbar: { height: 22 },
  sidebar: {
    defaultWidth: 240,
    minWidth: 170,
    maxWidth: 500,
    autoHideThreshold: 120,
  },
  auxiliarySidebar: { width: 240 },
} as const
```

### 3.5 shell.config.ts

```typescript
export const SHELL_DEFAULTS = {
  loginShell: true,        // 是否以 login shell 启动
  // shell 路径由运行时检测，这里只存开关和默认值
} as const
```

---

## 4. WebGL 渲染启用

### 4.1 实现

在 `TerminalInstance.tsx` 中，`terminal.open(container)` 之后加载 WebGL addon：

```typescript
import { WebglAddon } from '@xterm/addon-webgl'

// 在 terminal.open() 之后
try {
  const webglAddon = new WebglAddon()
  webglAddon.onContextLoss(() => {
    webglAddon.dispose()
    // 自动回退到 canvas 渲染
  })
  terminal.loadAddon(webglAddon)
} catch {
  // WebGL 不可用，静默使用 canvas fallback
}
```

### 4.2 注意事项

- try-catch 确保在不支持 WebGL 的环境（虚拟机、远程桌面）中不会崩溃
- `onContextLoss` 监听确保 GPU context 丢失时优雅降级
- 无需用户配置，自动启用最佳渲染方式

---

## 5. 服务层接口抽象

### 5.1 目标

为 main process 的服务建立统一接口，Phase 2 引入 inversify 时只需加装饰器。

### 5.2 ITerminalService 接口

新建 `src/shared/types/services.ts`：

```typescript
export interface ITerminalService {
  create(options: IShellOptions): number
  write(id: number, data: string): void
  resize(id: number, cols: number, rows: number): void
  kill(id: number): void
  onData(id: number, callback: (data: string) => void): void
  onExit(id: number, callback: (code: number) => void): void
}
```

### 5.3 改造计划

1. `PtyService` 加 `implements ITerminalService`，确保符合接口
2. `terminal.ipc.ts` 通过 `ITerminalService` 类型引用 service 实例
3. Phase 2 新增 `SshService implements ITerminalService`，inversify 根据连接类型注入

### 5.4 不做的事

- 不立即引入 inversify 容器
- 不创建 factory / provider / registry 模式
- 不改动 renderer 侧架构

---

## 6. electron-store 引入

### 6.1 安装

```bash
npm install electron-store
```

### 6.2 Store Schema

新建 `src/main/services/store.service.ts`：

**settings 命名空间:**
```typescript
interface ISettings {
  fontSize: number          // 默认 14
  fontFamily: string        // 默认 'Menlo, Monaco, Consolas, monospace'
  shellPath: string         // 默认 '' (自动检测)
  loginShell: boolean       // 默认 true
  theme: string             // 默认 'dark-plus'
}
```

**connections 命名空间:**
```typescript
interface IConnectionItem {
  id: string
  name: string
  type: 'local' | 'ssh'
  folderId?: string         // 所属文件夹 ID
  // SSH 专属字段
  host?: string
  port?: number             // 默认 22
  username?: string
  authType?: 'password' | 'privateKey'
  encryptedPassword?: Buffer    // safeStorage 加密
  privateKeyPath?: string       // 只存文件路径，不存内容
  encryptedPassphrase?: Buffer  // 私钥的 passphrase (safeStorage 加密)
}

interface IConnectionFolder {
  id: string
  name: string
  parentId?: string         // 支持嵌套
  expanded: boolean
}
```

### 6.3 凭据安全

- **密码/passphrase**: 使用 Electron `safeStorage` API 加密
  - macOS → Keychain
  - Windows → DPAPI
  - Linux → libsecret
- **私钥**: 只存文件路径，连接时由 SshService 读取文件内容
- **safeStorage 不可用时**: 提示用户密钥链服务不可用，密码类字段不保存
- **WebDAV 同步注意**: safeStorage 加密是设备绑定的，同步时凭据字段需特殊处理（跳过或要求重新输入）

### 6.4 IPC 扩展

新增 channels（`src/shared/ipc-channels.ts`）：
- `STORE_GET` — invoke: (key: string) → any
- `STORE_SET` — send: { key: string, value: any }
- `STORE_GET_ALL` — invoke: () → StoreSchema

Preload 扩展 `window.storeApi`：
```typescript
storeApi: {
  get: (key: string) => ipcRenderer.invoke('store:get', key),
  set: (key: string, value: any) => ipcRenderer.send('store:set', { key, value }),
  getAll: () => ipcRenderer.invoke('store:getAll'),
}
```

### 6.5 connections store 对接

- `connections.store.ts` 初始化时调用 `storeApi.getAll()` 加载持久化数据
- 变更（添加/删除/移动 folder/item）时通过 `storeApi.set()` 写回

### 6.6 本次不做

- 不实现设置页面 UI（Phase 1 剩余任务）
- 不实现连接编辑/删除 UI（Phase 2 任务）
- 不实现 safeStorage 加密/解密调用（Phase 2 SSH 实现时完成）

---

## 7. 文档更新

### 7.1 更新列表

| 文件 | 更新内容 |
|------|----------|
| `docs/project-plan.md` | 新增 Phase 1.5 阶段，更新技术栈表（新增 electron-store），更新架构图，更新路线图，新增凭据安全决策 |
| `docs/handoff.md` | 同步当前完成状态，新增 config 目录说明，新增 electron-store 说明，更新下一步工作建议 |
| `README.md` | 更新 Project Structure（新增 config/、store.service.ts），更新 Roadmap |

---

## 8. 更新后的路线图

### Phase 1.5: 梳理与基础设施（本次）
- [当前] 技术债清理（删未使用代码/目录、补 ESLint 配置）
- [当前] 配置提取 + 主题系统骨架（CSS 变量 JS 注入机制）
- [当前] WebGL 渲染启用（含 canvas fallback）
- [当前] 服务层接口抽象（ITerminalService）
- [当前] electron-store 引入 + 凭据安全 schema
- [当前] 文档全量更新

### Phase 1 剩余
1. 终端分屏（水平/垂直，参考 VS Code editor group）
2. 基础设置页（基于 electron-store，字体/主题/shell 配置，含 login shell 开关）
3. 快捷键系统（全局快捷键注册 + 用户自定义映射）

### Phase 2: SSH 连接
1. inversify DI 容器引入，注册 PtyService / SshService
2. ssh2 集成（SshService implements ITerminalService）
3. 新建连接弹窗（选类型 → 配置表单）
4. 凭据安全实现（safeStorage 加密/解密）
5. 连接保存/编辑/删除（connections store 持久化）
6. 连接状态监控与自动重连
7. Sidebar 连接树完善（分组、状态图标、右键菜单）

### Phase 3: SFTP 文件管理
- 远程文件树浏览（Auxiliary Sidebar 激活）
- 文件上传/下载（拖拽 + 传输队列 + 进度显示）
- Monaco Editor 集成（远程文件编辑）

### Phase 4: 增强功能
- 会话录制与回放
- 命令片段管理（snippets）
- 多窗口支持
- 主题系统完善（亮色/自定义主题，基于 Phase 1.5 主题骨架）

### Future
- 串口连接（serialport）
- RDP 远程桌面
- WebDAV 配置同步（设置/连接跨设备同步，凭据需特殊处理）
- Plugin 系统（AI 补全/分析）

---

## 9. 关键技术决策记录（新增）

| 决策 | 选择 | 原因 |
|------|------|------|
| DI 容器 | 保留 inversify，Phase 2 启用 | 当前只有 PtyService，DI 无实际价值；Phase 2 多 service 后引入 |
| 主题色管理 | JS 注入 CSS 变量 | 支持运行时切换主题，CSS 文件不硬编码色值 |
| WebGL 渲染 | 启用，带 canvas fallback | 性能更好，try-catch 确保兼容性 |
| 持久化 | electron-store | 类型安全、schema 验证、简单可靠 |
| 凭据安全 | Electron safeStorage | 利用 OS 原生密钥链，不自行加密 |
| 私钥存储 | 只存文件路径 | 避免在配置文件中暴露私钥内容 |
| 代码执行 | 设计 Claude，编辑 Codex | 分工协作，Claude 专注架构和审查 |
