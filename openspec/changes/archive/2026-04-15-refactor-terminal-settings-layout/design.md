## Context

当前 zTerm 工作台已经具备固定的 workbench chrome：Title Bar、Activity Bar、Primary Sidebar、Main Area、Auxiliary Sidebar、Status Bar。现有实现中，Terminal 与 Settings 已经通过 `activeMainView` 在主区域切换，并且 Terminal workspace 会在 Settings 打开时保持挂载，避免销毁现有终端会话。

本次调整的核心问题不在于重新发明页面切换机制，而在于让页面层级与布局职责更接近 VS Code：Activity Bar 作为全局导航 chrome，Primary / Auxiliary Sidebar 作为 Terminal 页面专属的 workbench parts，而 Settings 左侧分类导航属于 Settings 页面内部导航，不属于 workbench sidebar part。

当前 zTerm 已经存在两类可复用资产：
- workbench 级布局与页面切换状态：`Workbench`、`MainArea`、`workbench.store`
- 设置与表单样式：`settings-section`、`settings-field`、连接弹窗与设置页共用的字段样式

因此本次设计应以最小改动重组现有区域职责，并避免引入一个包打天下的“通用 sidebar”组件。

## Goals / Non-Goals

**Goals:**
- 将 Terminal 与 Settings 统一为 Activity Bar 中的两个顶级页面入口。
- 保持 Terminal 页的三栏内容布局不变，仅在 workbench chrome 层控制各 part 的显示。
- 将 Settings 重构为尽量贴近 VS Code 设置页的页面结构：顶部 header/search 区，左侧 TOC 导航，右侧 settings rows 内容区。
- 复用现有 workbench page state、settings 表单样式与现有 sidebar 视觉 token。
- 采用接近 VS Code 的组织方式：part 独立、shared shell 复用、页面内部导航独立。

**Non-Goals:**
- 不引入新的路由系统或页面栈。
- 不重构 TerminalWorkspace、ConnectionTree、RemoteFileTree 的业务逻辑。
- 不新增完整的 searchable settings registry、动态搜索结果模型或扩展注入 settings 机制。
- 不把 Activity Bar、Primary Sidebar、Auxiliary Sidebar、Settings 分类导航压成同一个万能组件。

## Decisions

### 1. Activity Bar 直接承载 Terminal / Settings 两个顶级入口
Activity Bar 保持为独立 workbench part，只负责顶级页面切换，不承载页面内部导航。Settings 入口从底部 gear 特殊入口调整为与 Terminal 同级的主入口，统一激活态与切换语义。

**Why:** 这与 VS Code 将 activity bar 作为全局入口的职责一致，也能消除当前“Terminal 是主入口、Settings 是附属入口”的不对称结构。

**Alternatives considered:**
- 保留底部 gear 并只修改 Settings 页面布局：能减少改动，但无法统一顶级页面导航语义。
- 在 Settings 内再放返回按钮作为主导航：会继续保留双重导航语义，不符合本次目标。

### 2. Workbench 顶层继续保留独立 parts，而不是引入万能 sidebar
Workbench 顶层继续明确区分 Activity Bar、Primary Sidebar、Main Area、Auxiliary Sidebar。Terminal 页面显示 Primary Sidebar 与 Auxiliary Sidebar；Settings 页面隐藏这两个 workbench part，仅保留 Activity Bar + Main Area 的页面切换关系。

**Why:** VS Code 的复用发生在 pane/composite shell 层，而不是把所有区域都做成一个通用 sidebar。zTerm 当前布局已经接近这一组织方式，继续沿用可以减少重构范围。

**Alternatives considered:**
- 做一个通用 Sidebar 组件供 Terminal 左栏、右栏、Settings 左栏全部调用：短期看更统一，但会混合 workbench part 与页面内部导航的职责，后续参数会快速膨胀。

### 3. 提取共享 pane shell，而不是共享全部内容组件
为 Primary Sidebar 与 Auxiliary Sidebar 提取轻量共享 shell，统一 header、title、actions、content 容器以及相关样式 token；各自内容仍然独立注入。Settings 左侧分类导航可以复用这层 shell 的视觉语言或局部结构，但不直接等同于 workbench sidebar。

**Why:** 当前 `.sidebar__*` 与 `.auxiliarybar__*` 存在平行结构，适合在壳子层收敛。这样既能复用，又不会把不同区域的行为强行统一。

**Alternatives considered:**
- 完全不抽共享壳子，只保留两套平行组件：实现简单，但会继续复制 header/content 样式。
- 抽象到行为层，连 toolbar/path/error/empty state 都统一：会过度抽象，违背最小实现原则。

### 4. Settings 左侧分类导航作为页面内部导航实现
SettingsView 内部改为两栏布局：左侧为分类导航列表，右侧为设置内容区。分类导航仅负责切换 Settings 页面内部 section，不接入 workbench store 的顶级页面状态。

**Why:** 按 VS Code 方式，Settings 分类属于页面内部信息架构，而不是 workbench part。这样能避免把工作台导航与页面内导航耦合在同一套状态里。

**Alternatives considered:**
- 把 Settings 左侧分类导航挂到全局 store，视作新的 sidebar 模式：会扩大 workbench store 职责，不必要。

### 5. Settings 右侧继续复用现有表单与 section 样式
Settings 内容区继续使用现有 `settings-section`、`settings-field`、`settings-field__input`、`settings-field__select` 等样式结构，仅为两栏布局、分类导航与内容分组增加必要的新样式。

**Why:** 这套样式已在 SettingsView 与 SSH 连接弹窗中验证可复用，继续沿用可以降低视觉和实现分叉。

**Alternatives considered:**
- 为新版 Settings 完全重写卡片/表单样式：视觉统一性可能更强，但会制造新的平行实现。

## Risks / Trade-offs

- [Settings 左侧导航抽得过重] → 只把它定义为 Settings 页面内部导航，不进入 workbench 顶层状态模型。
- [共享 pane shell 抽象过度] → 共享范围限定为 header / title / actions / content 容器，不统一业务行为。
- [Activity Bar 切换入口调整影响现有键盘命令] → 保持现有打开设置与返回终端命令语义，仅让它们改为切换顶级页面。
- [Terminal / Settings 页面边界表述不清导致实现混淆] → 明确 Settings 是独立页面，终端页左右侧边栏只属于 Terminal page 的 workbench parts，不把它描述成 Settings 页内部的局部隐藏。

## Migration Plan

1. 调整 OpenSpec requirements，先明确 Activity Bar 顶级导航与 Settings 两栏布局的目标行为。
2. 重构 renderer 侧 workbench 页面切换与 Activity Bar 入口结构，保持 Terminal workspace 挂载语义不变。
3. 提取共享 pane shell 或共享样式层，收敛 Primary Sidebar / Auxiliary Sidebar 公共结构。
4. 重构 SettingsView 为内部两栏布局，并将现有设置项映射到对应分类。
5. 通过 `npm run lint` 与 `npx tsc --noEmit` 验证静态正确性，再由用户手动运行 `npm run dev` 验证 GUI 交互。

## Open Questions

- 本次 Settings 左侧分类首批是否只包含 `General` 与 `Appearance`，还是需要把现有终端相关项单独拆成 `Terminal` 分类名。
- Shared pane shell 最终是以 React 组件形式抽出，还是先只收敛为共享 CSS 类与一致的 DOM 结构。当前更倾向先做轻量 React shell，但实现时可根据代码量再确认。
