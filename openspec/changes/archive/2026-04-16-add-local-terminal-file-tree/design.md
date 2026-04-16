## Context

当前 zTerm 的辅助侧边栏已经完整承载 SSH 会话下的远程文件树工作流：通过激活 terminal session 的 `connectionId` 推导上下文，支持 cwd 跟随、工具栏、父目录导航、上传下载与详情菜单。但对本地 terminal session，`AuxiliarySidebar` 仍然直接渲染“Remote files are available for SSH terminals.” 空态，这意味着同一工作台在本地与远程两类 session 之间的体验不一致。

现有代码里已经有几个可以直接复用的基础：
- `terminal.store.ts` 已为 session 保存 `kind`、`ptyId` 与最近一次 `cwd`。
- `TerminalInstance.tsx` 已能从 OSC 7 / 633 事件中写回 cwd；SSH shell 已主动注入 shell integration。
- 辅助侧边栏、树样式、工具栏按钮样式、父目录导航与右键菜单骨架都已存在。
- main 侧目前只有 SFTP 文件树 service，还没有面向本地文件系统的目录读取 IPC。

这次 change 的目标不是把远程文件树复制一份，而是把现有 SSH 文件树提升成统一 Explorer 骨架，在现有辅助侧边栏框架中补上“本地 session 也有 Explorer”的 provider，实现层只让路径来源与目录数据源分层。

## Goals / Non-Goals

**Goals:**
- 为本地 terminal session 提供辅助侧边栏文件树，默认展示当前 session cwd 的本地目录内容。
- 将本地与 SSH 文件树收敛到同一个 Explorer 结构中，复用统一的树状态模型、工具栏交互与树渲染骨架。
- 支持与本地终端 cwd 双向同步：文件树可跟随终端当前路径，终端也可切换到当前文件树路径。
- 支持当前目录刷新、父目录导航、目录懒加载展开与本地会话下的错误展示。
- 让辅助侧边栏按 session 类型切换 provider：SSH 继续显示远程文件树，本地 session 显示本地文件树，而不是固定空态。
- 继续沿用 preload + IPC + main service 边界，renderer 不直接访问 Node `fs`。

**Non-Goals:**
- 不在这次 change 中实现本地文件的新建、重命名、删除、拖拽、复制粘贴或编辑器联动。
- 不改动现有 SSH 远程文件树的上传、下载、详情工作流。
- 不重构整个 auxiliary sidebar 为通用插件式 view 容器；只做当前文件树场景所需的最小抽象。
- 不在这次 change 中补做本地 shell integration；优先复用 node-pty 启动参数与已有 cwd 状态。

## Decisions

### 1. 新增独立本地文件树 service，而不是让 renderer 直接读本地文件系统
- 决策：在 main 侧新增面向本地目录读取的 service 与 IPC，renderer 通过 preload 暴露的 API 请求目录列表。
- 原因：当前架构已经明确 renderer 不直接接触 ssh2、dialog 或本地文件系统；本地文件树也应保持同样边界，避免在 renderer 打开 Node 权限面。
- 备选方案：
  - 直接在 renderer 用 `fs` 读取目录：实现快，但破坏当前安全边界与架构一致性。
  - 把本地目录读取塞进 `PtyService`：会让 PTY 生命周期与文件树职责耦合，职责不清。

### 2. 复用当前 terminal session 的 `cwd` 作为本地文件树根上下文
- 决策：本地文件树与远程文件树一样，绑定当前激活 terminal session；当 session.kind 为 `local` 时，以该 session 最近一次 `cwd` 作为当前浏览目录。
- 原因：terminal store 已经是当前工作台里最可靠的 session 上下文来源，不需要再引入额外的“当前本地目录”全局状态。
- 备选方案：
  - 单独维护全局本地 explorer 路径：会与多 tab、多 pane 的 session 上下文脱节。
  - 固定使用 `os.homedir()` 或项目根目录：不符合“跟随当前终端”的目标。

### 3. 为本地终端补充 OSC 7 cwd 上报，保持与 SSH 同一套会话同步机制
- 决策：本地 terminal 创建时在 `IShellOptions.env` 中注入终端 shell integration 所需环境，并在 `PtyService` 启动本地 shell 时通过 launch 参数接入与 SSH 等价的 cwd 上报脚本，继续由 `TerminalInstance.tsx` 解析 OSC 7 / 633 更新 store。
- 原因：renderer 已经具备成熟的 cwd 解析链路；如果本地 terminal 仍然没有稳定 cwd 上报，本地文件树只能停留在“启动目录一次性快照”，无法满足跟随终端路径的需求。
- 备选方案：
  - 每次点击“文件树切到终端路径”时注入 `pwd`：会污染终端输出并可能打断用户输入。
  - 依赖 `node-pty` 初始 `cwd`，后续不更新：无法覆盖 `cd` 后的真实工作目录。

### 4. 统一成一个 Explorer store + provider 适配层，而不是本地/远程各做一份 store
- 决策：将现有 `remote-files.store.ts` 演进为更通用的 explorer store，继续维护 `currentPath`、`rootIds`、`nodes`、`expandedPaths`、`loadingPaths`、`error`、`followTerminalPath` 这套状态模型；本地与 SSH 的差异通过 provider 适配层处理，而不是拆成 `local-files.store` 与 `remote-files.store` 两份并行状态。
- 原因：用户明确要求把本地与 SSH 文件树视为同一个功能，仅路径来源不同。既然交互形态、树结构、工具栏、父目录导航都一致，就应该复用统一状态模型，把差异收敛到“如何读目录、如何拿当前上下文、支持哪些动作”。
- 备选方案：
  - 新增独立 `local-files.store`：实现上更直接，但后续会出现两套缓存、两套刷新逻辑、两套 follow-terminal 逻辑并行演化。
  - 在单 store 内部直接写大量 `if (kind === 'ssh')` / `if (kind === 'local')`：短期可做，但 provider 边界不清，后续扩展其它来源时会继续膨胀。

### 5. 统一 Explorer UI，AuxiliarySidebar 只负责挑选当前 provider/context
- 决策：继续由 `AuxiliarySidebar` 从激活 tab/pane/session 推导上下文，但它只负责解析当前 session 属于 local 还是 ssh，并把对应 provider 与 context 交给统一 Explorer 组件；Explorer 内部复用现有树节点、路径栏、工具栏与错误态骨架，根据 provider capabilities 决定展示哪些动作。
- 原因：当前 change 的价值在于补全本地 terminal 文件树，同时避免把同类能力做成两套平行 UI。保持入口不变、结构统一，最符合用户“这是同一个功能”的判断。
- 备选方案：
  - 新增独立 local explorer view：会扩大布局与导航改动范围。
  - 保留 `RemoteFileTree` 与新的 `LocalFileTree` 两套组件：短期能跑，但后续维护与交互一致性都会变差。

## Risks / Trade-offs

- [本地 shell 未稳定上报 cwd，导致文件树无法跟随 `cd`] → 优先把 shell integration 接入本地终端创建链路，并保留“手动切回当前文件树路径/刷新当前目录”作为兜底。
- [本地目录层级很深或单目录文件很多，首次实现可能缺少虚拟化优化] → 先复用当前树模型与懒加载策略，维持最小可用；性能优化留待后续需求驱动。
- [统一 Explorer 改动会触及现有远程文件树稳定代码] → 先保持状态模型与 UI 交互不变，只把目录读取与动作差异抽到 provider 层，避免一次性重写整棵树。
- [本地文件树与未来本地文件操作需求可能继续扩展] → 先在 spec 中把本次范围限定为浏览与路径同步，避免把后续编辑/管理能力提前设计进来。

## Migration Plan

1. 为 change 补齐 proposal / design / specs / tasks，明确本地文件树能力与对远程 spec 的调整。
2. 在 main + preload + shared 层新增本地目录读取 API，并为本地 terminal 启动链路接入 cwd 上报能力。
3. 在 renderer 将现有远程文件树状态演进为统一 Explorer store，并更新 AuxiliarySidebar 按 session 类型选择 provider/context。
4. 复用现有树样式与工具栏模式，抽出统一 Explorer 组件，补齐本地文件树的刷新、父级导航、路径同步与错误态。
5. 通过 `npm run lint`、`npm run typecheck`，再由用户手动运行 `npm run dev` 验证本地 terminal + 本地文件树交互。

## Open Questions

- 本地文件树是否需要在 header 上显示固定标题 `Explorer`，还是延续远程文件树的连接名展示方式；当前倾向对本地会话使用固定标题 `Explorer`，以贴近 VS Code。
- 本地 shell integration 是否直接复用现有 SSH 的 633 cwd 输出脚本，还是补充标准 OSC 7 输出；实现时可优先保持与现有 parser 兼容即可。
