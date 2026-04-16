## Context

这次变更同时覆盖两个跨层问题：

1. 右键菜单当前是 renderer 内自绘菜单，调用点分散在连接树、文件树与终端 pane，菜单项以 closure 形式直接绑定动作，无法复用 Electron 原生菜单；
2. Explorer 错误当前通过 `tree.error` 直接驱动 AuxiliarySidebar 的主渲染分支，导致任意目录访问失败、下载失败或上传失败都可能替换掉整个文件树区域。

这两个问题都横跨 main / preload / renderer / store / UI 多层，因此需要一个明确的分层设计，但又不能为当前范围引入 VS Code 全量菜单框架或完整通知中心。

## Goals / Non-Goals

**Goals:**
- 让连接树、文件树与终端 pane 的右键菜单切到 Electron 原生菜单。
- 保持与 VS Code 桌面版相似的职责划分：renderer 负责菜单语义与动作，main 只负责 native popup 与点击回传。
- 让 Explorer 失败信息显示到底部 StatusBar，而不是覆盖整个文件树区域。
- 保持文件树在错误场景下仍可继续导航、刷新与切换路径。

**Non-Goals:**
- 不实现 VS Code 完整的 `MenuId` / `IMenuService` / context key 体系。
- 不引入统一通知中心、toast 系统或自动消失策略。
- 不扩展为所有业务模块都可复用的复杂全局消息框架。

## Decisions

### 1. 原生右键菜单采用“共享序列化模型 + main transport + renderer handler map”
- 在 shared 层定义可序列化菜单项模型，preload 暴露 `contextMenuApi`，main 通过 Electron `Menu.popup()` 弹出系统菜单。
- renderer 继续构造菜单项与上下文动作，但不再把 closure 直接传给 UI 组件，而是转成一次菜单请求，并在 renderer 侧维护 `menuId -> itemId -> handler` 映射。
- 这样可以贴近 VS Code 的 desktop split，同时避免把业务执行迁到 main。

**Why this over command-only execution:**
- 当前很多菜单动作是强上下文行为（如删除某个连接、下载某个文件、关闭某个 pane），为它们强行建立完整命令注册会增加无收益复杂度。
- renderer handler map 已足够满足当前范围，并且更贴近现有代码结构。

### 2. Explorer 错误保留在 store 中，但不再控制文件树显隐
- `explorer.store` 继续保留每棵树的 `error` 字段，减少已有异步流程改动。
- `AuxiliarySidebar` 不再以 `tree.error` 作为覆盖整个文件树区域的优先分支。
- 文件树继续根据 context / loading / currentPath / empty state 渲染。

**Why this over removing tree.error entirely:**
- 完全移除 `tree.error` 会扩大修改范围，影响已有异步状态收敛点。
- 保留它更利于后续在节点级或局部 UI 中继续复用。

### 3. StatusBar 消息走轻量 workbench 全局状态
- 在 `workbench.store` 中增加 `statusMessage` 与 setter，由 Explorer 错误通路写入。
- `StatusBar` 订阅这一字段并显示错误文案。

**Why this over putting message into explorer.store only:**
- 错误展示目标是全局底部状态栏，状态应属于 workbench chrome，而不是文件树局部 store。
- 这也为后续其他 workbench 级消息留出最小扩展点。

### 4. Explorer 成功操作应清掉旧状态栏错误
- 在新的文件树加载操作开始时清空状态栏消息。
- 在目录读取返回成功结果时，用 `result.error ?? null` 覆盖当前状态栏消息。

**Why:**
- 避免旧错误在用户已经恢复正常浏览后长期滞留。

## Risks / Trade-offs

- **菜单动作仍由 renderer 本地映射维护** → 若未来菜单入口继续增多，可能需要更统一的 command 层。
- **StatusBar 目前只有单条消息槽位** → 后续若出现多个来源并发提示，需要定义优先级或队列。
- **保留 `tree.error` 但不再主导渲染** → 当前字段会暂时兼具“状态记录”而非“展示控制”含义，需要后续保持语义一致。
- **长错误消息可能挤占底栏空间** → 通过状态栏样式限制宽度并使用省略号缓解。
