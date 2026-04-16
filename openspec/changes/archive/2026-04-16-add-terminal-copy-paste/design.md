## Context

zTerm 当前已经具备终端主工作区、共享右键菜单 host、renderer 侧快捷键系统，以及通过 settings store 持久化终端/外观设置的基础设施。现阶段终端窗口仍缺少桌面终端常见的剪贴板交互：用户无法通过 `Cmd+C` 复制终端选区、无法通过 `Cmd+V` 粘贴系统剪贴板内容，也不能在终端右键菜单中直接访问复制/粘贴。

这次改动会横跨终端组件、快捷键边界、右键菜单入口以及设置持久化，因此需要在实现前明确几个约束：
- 继续使用当前 React + Zustand + Electron preload bridge 架构，不引入新依赖。
- 必须保护终端输入语义，不能因为加入复制快捷键而吞掉无选区时的终端按键。
- 设置项要延续现有 `settings` store 模式，并在未持久化时默认开启“选中即复制”。
- 右键菜单仍复用现有 `ContextMenuHost`，不新增另一套菜单系统。

## Goals / Non-Goals

**Goals:**
- 为终端选区提供键盘复制与系统剪贴板粘贴能力。
- 为终端右键菜单补充 `Copy` / `Paste` 入口，并与同一套终端剪贴板动作复用。
- 新增 `copyOnSelect` 设置并默认开启，使终端选区变化可直接驱动复制。
- 将复制触发条件限定为“终端存在选区”或“用户显式点击菜单项”，避免破坏终端正常输入。

**Non-Goals:**
- 不实现跨标签或全局工作台级的通用剪贴板命令面板。
- 不新增 Linux/Windows 专属快捷键自定义或用户可编辑快捷键 UI。
- 不改变 xterm.js 自身的文本选择模型或 shell 侧 bracketed paste 行为。
- 不把复制粘贴能力扩展到连接树、远程文件树或设置页文本控件之外的区域。

## Decisions

### 1. 终端剪贴板能力绑定到 `TerminalInstance`，使用 xterm.js 原生选择/粘贴 API
- 决策：复制基于 xterm 的 `hasSelection()` / `getSelection()` 与 `onSelectionChange`；粘贴基于 `paste(text)`，由活跃终端实例直接执行。
- 原因：终端选区和粘贴边界都属于具体 xterm 实例，放在 `TerminalInstance` 最近的层处理最直接，也能避免在 store 中保存临时选区文本。
- 备选方案：
  - 在 terminal store 中记录当前选区文本：会引入额外同步状态，且选区本就是瞬时 UI 状态。
  - 只依赖浏览器默认复制/粘贴行为：难以稳定控制 `Cmd+C` 仅在有选区时生效，也不利于菜单复用。

### 2. 系统剪贴板通过 Electron preload bridge 暴露，而不是直接依赖 `navigator.clipboard`
- 决策：在 preload 中新增安全的剪贴板读写方法，renderer 通过 `window` bridge 调用读写文本。
- 原因：zTerm 是 Electron 桌面应用，preload bridge 与现有 API 暴露模式一致，也能避免浏览器权限、焦点限制或 HTTPS 语义差异带来的不确定性。
- 备选方案：
  - 使用 `navigator.clipboard`：实现表面更短，但在 Electron 环境中的权限和可用性不如 preload bridge 稳定。
  - 每次经由 main IPC 转发：可行，但对单纯文本读写来说比 preload 直桥更绕。

### 3. `Cmd+C` 只在终端存在选区时拦截，否则继续交给终端/系统默认输入语义
- 决策：扩展现有 renderer 快捷键判断，为终端复制命令加入“必须存在选区”的前置条件；仅在条件满足时 `preventDefault` 并写入剪贴板。
- 原因：用户需求明确是“选中文字后可以通过 cmd+c 复制”。如果无选区时仍然强拦截，会破坏 `SIGINT` 等终端常见行为。
- 备选方案：
  - 始终拦截 `Cmd+C`：实现简单，但会明显破坏终端体验。
  - 完全不接入快捷键系统、只在 xterm DOM 上监听：会绕开现有统一作用域模型，后续不好维护。

### 4. 右键菜单在终端 pane 入口补充剪贴板动作，并保留现有终端关闭动作
- 决策：沿用 `TerminalPaneTree` 现有右键入口，在菜单项前部增加 `Copy` / `Paste`，并根据活跃终端实例状态控制 `Copy` 的可用性。
- 原因：当前终端 pane 已经有共享菜单入口，在这里扩展最小；同时用户要求的是“增加复制粘贴选项”，无需重做菜单体系。
- 备选方案：
  - 给 xterm 内层单独挂另一套原生菜单：会造成两个菜单入口与风格分叉。
  - 仅保留快捷键不做菜单：不满足用户要求。

### 5. `copyOnSelect` 作为 settings store 新字段，默认值为 `true`
- 决策：在 `ISettings` / `DEFAULT_SETTINGS` 中新增布尔字段 `copyOnSelect`，由 `settings-view` 暴露切换控件，并在终端实例中监听该配置决定是否在选区变化时自动写入剪贴板。
- 原因：该偏好属于终端行为配置，应该持久化且对新旧终端实例统一生效。默认开启符合常见终端产品预期，也与用户要求一致。
- 备选方案：
  - 仅做运行时内存态开关：重启丢失，不符合设置项语义。
  - 放到 terminal store 而不是 settings store：会与当前设置体系分离，增加维护成本。

## Risks / Trade-offs

- [复制快捷键误拦截终端输入] → 只有在活跃终端存在选区时才执行复制命令并阻止默认行为。
- [自动复制在拖选过程中频繁写剪贴板] → 仅在 xterm selection change 事件触发时同步最新非空选区，并在清空选区时不覆盖系统剪贴板。
- [菜单状态与活跃 pane 不一致] → 打开终端右键菜单前先切换 active pane，并从对应终端实例读取即时 clipboard capability 状态。
- [设置变更后老终端实例不生效] → 终端实例订阅 store 中的 `copyOnSelect` 变化，直接影响现有实例的 selection handler。

## Migration Plan

1. 扩展 shared settings 类型与默认值，加入 `copyOnSelect`。
2. 在 preload 暴露剪贴板读写 bridge，并补充 renderer 类型声明。
3. 为终端实例建立轻量 runtime registry 或命令入口，暴露复制/粘贴/选区状态给快捷键与菜单复用。
4. 扩展快捷键与终端右键菜单，让 `Cmd+C` / `Cmd+V` 与 `Copy` / `Paste` 复用同一套终端剪贴板动作。
5. 在 SettingsView 中加入默认开启的“Copy on Selection”设置行。
6. 通过 `npm run lint`、`npx tsc --noEmit` 和用户手动 GUI 验证确认复制、粘贴、右键菜单与设置行为正确。

## Open Questions

- 右键菜单中的 `Paste` 是否需要在系统剪贴板为空字符串时禁用；当前更倾向保持可点，粘贴空字符串时不产生额外效果。
- 后续若要支持 Windows/Linux 默认快捷键，是否继续沿用现有 keybinding registry 以平台分支方式扩展；本次先以 macOS `Cmd` 交互为准。