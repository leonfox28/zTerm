# zTerm 基础设置页设计文档

> 历史 superpowers 文档：保留作背景参考。当前基础设置页的规划与实现主入口请看 `openspec/changes/migrate-superpowers-to-openspec/`。

> 目标：以 VS Code Settings Editor 的思路，在 zTerm 主工作区中落地一个可扩展的基础设置页，首版覆盖终端与主题设置，并让可即时生效的配置尽量即时生效。

---

## 1. 背景与目标

当前 zTerm 已具备本地终端、分屏、共享右键菜单、主题 token 与 `electron-store` 持久化基础设施，但“设置”仍停留在数据 schema 层，尚未形成可用的 UI 与运行时生效链路。

本次设计目标是：

1. 将 Activity Bar 底部 gear 入口接成一个真正可用的 Settings View。
2. 首版支持以下设置项，并保存到现有 `settings` schema：
   - `fontFamily`
   - `fontSize`
   - `shellPath`
   - `loginShell`
   - `theme`
3. 生效策略遵循“尽量即时生效”：
   - 主题：立即生效
   - 字体/字号：运行中的终端立即刷新
   - shell 路径 / login shell：仅对新开的终端生效
4. 首版提供两套主题：`dark-plus` 与 `light-plus`。
5. 延续 VS Code 的思路：设置不是弹窗，而是主区中的一个独立页面。

---

## 2. VS Code 参考结论

本次设计直接参考本地 VS Code 源码中的两条核心思路：

1. **设置作为主区 editor 打开**
   - 参考：`/Users/huyuanzhe/prj-code/vscode/src/vs/workbench/services/preferences/browser/preferencesService.ts`
   - `openSettings()` 最终走到 `openSettings2()`，由 editor service 在主工作区打开 Settings Editor，而不是弹窗。

2. **终端设置入口直接打开 settings，并定位到 terminal feature**
   - 参考：`/Users/huyuanzhe/prj-code/vscode/src/vs/workbench/contrib/terminal/browser/terminalActions.ts`
   - `Configure Terminal Settings` 的动作本质上是打开设置页并聚焦 terminal 相关配置，而不是单独做一套终端专用配置窗口。

zTerm 不会照搬 VS Code 的 editor/input/service 体系，但会保留这两个产品层决策：
- 设置页属于主区内容，而不是模态层
- 终端相关配置归入统一设置体系，而不是散落在局部面板中

---

## 3. 范围与非目标

### 3.1 本次范围

- 在主区新增 Settings View
- gear 图标可打开 Settings View
- 终端工作区与设置页之间可切换
- 设置项表单、持久化、运行时应用链路打通
- 新增 `light-plus` 主题
- 启动时按持久化设置恢复当前主题

### 3.2 明确不做

- 不做完整的 VS Code Settings 搜索、过滤、标签系统
- 不做 Settings JSON / 文本编辑模式
- 不做工作区级 / 用户级设置分层
- 不做终端 profile 系统
- 不做 shell 路径自动探测 UI
- 不做 SSH 设置页；SSH 连接管理留到后续单独设计

---

## 4. 交互与页面结构

### 4.1 打开方式

- Activity Bar 底部 gear 点击后，主区切换为 Settings View。
- gear 在设置页打开时显示 active 状态。
- 再次点击 gear 不做“关闭设置页”的 toggle 语义，保持行为稳定；返回终端区由设置页内返回按钮或终端相关入口处理。

### 4.2 页面结构

Settings View 采用单页分组布局，而不是首版就做复杂目录树。结构如下：

1. **Header**
   - 标题：`Settings`
   - 简短说明：当前页用于配置终端与外观行为
   - 返回按钮：`Back to Terminal`

2. **Section: Terminal**
   - Font Family（文本输入）
   - Font Size（数字输入）
   - Shell Path（文本输入）
   - Login Shell（开关）
   - 辅助说明：shell 相关设置仅对新终端生效

3. **Section: Appearance**
   - Theme（下拉选择）
   - 选项：`Dark+`、`Light+`

### 4.3 为什么不是直接替换 MainArea 内容

当前 `TerminalInstance` 在卸载时会主动 kill PTY 并 dispose terminal。如果 Settings View 通过条件渲染直接替换掉终端工作区，已有终端会被全部杀掉，这与“打开设置页只是切换主区视图”这一用户预期冲突。

因此 Settings View 的实现必须遵循：
- **终端工作区保持 mounted**
- 主区在 `terminal` / `settings` 两个 view 之间切换可见性
- 打开设置页不会销毁现有终端会话

---

## 5. 架构设计

### 5.1 Workbench 视图状态

在现有 `workbench.store.ts` 中增加主区视图状态：

- `activeMainView: 'terminal' | 'settings'`
- `openSettingsView()`
- `openTerminalView()`

现有的 `activeViewId` 继续服务于左侧 sidebar（terminal / connections），不要让“设置页是否打开”混入 sidebar 语义。

### 5.2 MainArea 容器拆分

当前 `MainArea` 固定渲染 `TerminalTabs + TerminalPanel`。本次改为：

- `TerminalWorkspace`：承载原有 `TerminalTabs + TerminalPanel`
- `SettingsView`：新设置页
- `MainArea`：根据 `activeMainView` 控制两个子视图的可见性，但两者保持 mounted

这样做的收益：
- 不破坏现有终端工作区结构
- 后续还能继续加 `ssh-connections`、`welcome` 等主区页面
- 与 VS Code “主区承载不同 editor/view” 的思路一致

### 5.3 Settings Store

新增 renderer 侧 `settings.store.ts`，负责：

- 从 `window.storeApi.get('settings')` 读取初始值
- 在 renderer 内维护当前 `settings`
- 对外提供 `updateSettings(patch)`
- 持久化到 `window.storeApi.set('settings', nextSettings)`
- 在设置变化时触发运行时应用逻辑

这样可以避免：
- 每个组件各自读 store API
- `TerminalInstance`、`SettingsView`、启动入口各自重复拼设置逻辑

### 5.4 Theme Registry

扩展 `src/shared/config/theme.config.ts`，从“单个 `darkPlusTheme` 常量”升级为：

- `ThemeId = 'dark-plus' | 'light-plus'`
- `themesById: Record<ThemeId, ITheme>`
- `themeOptions`（供设置页下拉直接消费）
- `getThemeById(themeId)`

首版主题：
- `dark-plus`：保留现有主题值
- `light-plus`：参考 VS Code Light+ 的整体观感，补齐现有 token 集

### 5.5 启动阶段主题恢复

当前 renderer 入口在 React 渲染前直接调用 `applyTheme(darkPlusTheme)`。

本次改为：
1. 启动时先通过 `window.storeApi.get('settings')` 读取已保存设置
2. 解析 `settings.theme`
3. `applyTheme(getThemeById(settings.theme))`
4. 再挂载 React

这样能避免每次启动先闪 Dark+ 再切到 Light+。

---

## 6. 设置生效链路

### 6.1 主题

- 用户在 `SettingsView` 修改主题
- `settings.store.ts` 更新本地状态并持久化
- 立即执行 `applyTheme(getThemeById(next.theme))`
- workbench、菜单、终端区域背景等 UI 同步切换

### 6.2 字体 / 字号

运行中的终端当前是在 `TerminalInstance` 初次挂载时把 `fontSize`、`fontFamily` 写死到 xterm 配置里。

本次设计改为：
- `TerminalInstance` 从 settings store 读取初始字体设置
- 监听 settings 变化事件
- 当 `fontFamily` / `fontSize` 变化时，更新 xterm options 并触发 refit

这样已有终端无需重建即可看到变化。

### 6.3 shell 路径 / login shell

这两个设置只影响**新创建的 PTY**。

因此链路为：
- `TerminalInstance` 创建 PTY 时，从 settings store 读取最新的 `shellPath` / `loginShell`
- `window.terminalApi.create()` 的参数扩展为包含这两个字段
- main 侧 `PtyService.spawn()` 优先使用传入值；为空时再回退默认 shell 与默认 login shell 配置

已有终端不强制重启，不做隐式重建。

---

## 7. IPC 与类型调整

### 7.1 `IShellOptions` 扩展

当前 `IShellOptions` 只有 `cols/rows/cwd/shell/env`。

本次新增：
- `loginShell?: boolean`

理由：
- `shellPath` 可以继续复用 `shell`
- `loginShell` 不能继续从 `SHELL_DEFAULTS.loginShell` 这个编译期常量读取，否则设置页无法真正影响新终端

### 7.2 PTY 创建逻辑

`PtyService.spawn()` 调整为：
- `const shell = options.shell || this.getDefaultShell()`
- `const loginShell = options.loginShell ?? SHELL_DEFAULTS.loginShell`
- `const args = loginShell ? ['-l'] : []`

这样既保留默认行为，也允许设置页覆盖默认值。

---

## 8. 组件拆分

首版尽量保持清晰但不过度抽象。

### 新增组件

- `src/renderer/components/settings/SettingsView.tsx`
  - 设置页主体
- `src/renderer/components/workbench/TerminalWorkspace.tsx`
  - 从 `MainArea` 抽出终端工作区

### 修改组件

- `ActivityBar.tsx`
  - gear 增加点击行为和 active 状态
- `MainArea.tsx`
  - 管理 `TerminalWorkspace` / `SettingsView` 的显示
- `TerminalInstance.tsx`
  - 读取并响应 settings
- `App.tsx`
  - 初始化 settings store
- `renderer/main.tsx`
  - 启动前恢复主题

### 新增样式

- `src/renderer/styles/settings.css`

视觉风格上参考 VS Code Settings Editor：
- 使用主区背景色
- 分组标题清晰
- 表单控件保持 workbench 风格，而不是系统原生弹窗风格
- 间距、边框、悬停反馈尽量贴近 VS Code，但不引入整套复杂样式系统

---

## 9. 错误处理与边界

### 9.1 主题回退

- 若持久化中的 `theme` 值未知，则回退 `dark-plus`
- 不为此弹错误提示，直接走安全默认值

### 9.2 shell 路径为空

- 空字符串表示“使用系统默认 shell”
- renderer 传给 main 时应转成 `undefined`，避免把空字符串当可执行文件路径

### 9.3 shell 路径无效

用户可以输入错误的 shell 路径，这会直接影响“新建终端”。这是设置页范围内必须覆盖的真实边界。

因此需要补一个紧邻当前需求的修复：
- 若 `pty.spawn()` 因 shell 路径无效而抛错，`terminal:create` 应把错误返回给 renderer
- `TerminalInstance` 在创建失败时，写入一条清晰的失败信息，而不是静默失效

首版不做复杂 toast 系统，只做最小可理解反馈。

---

## 10. 验证方案

### 10.1 静态验证

- `npm run lint`
- `npx tsc --noEmit`

### 10.2 用户手动 GUI 验证

1. 打开应用，点击 gear，进入 Settings View
2. 再返回终端，确认打开设置页不会杀掉现有终端
3. 修改 theme，确认 UI 立即切换
4. 修改 font family / font size，确认现有终端即时刷新
5. 修改 login shell，确认新终端使用新策略，已有终端不受影响
6. 修改 shell path，确认新终端使用指定 shell
7. 重启应用，确认设置持久化恢复

---

## 11. 后续扩展预留

这个设置页首版故意只做单页分组布局，但架构上为后续两类扩展预留边界：

1. **快捷键系统**
   - 后续可在 Settings View 中新增 `Keyboard Shortcuts` 分组，或者演进为更完整的设置导航结构

2. **SSH 连接管理**
   - 连接配置不会放进本次设置页，但本次主区 view 容器改造可以复用于未来的 SSH 配置页 / 连接详情页

---

## 12. 结论

推荐实现路径是：

- 采用主区独立 Settings View
- 保持终端工作区 mounted，避免切页时误杀 PTY
- 用单独 `settings.store.ts` 管理设置读取、持久化与运行时应用
- 以 VS Code Settings Editor 为产品参考，而不是做一个临时弹窗
- 把 `shellPath` / `loginShell` 的可生效链路一次打通，为后续 SSH 与快捷键页面铺平主区架构
