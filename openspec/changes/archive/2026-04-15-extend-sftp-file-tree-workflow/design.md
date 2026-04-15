## Context

当前 `sftp-remote-file-tree` 已经完成第一阶段：辅助侧边栏可基于激活 SSH tab 显示只读远程文件树，支持懒加载、刷新与错误展示。但现有体验仍有明显断点：
- 文件树顶部只有路径文本与 header 刷新按钮，缺少围绕“当前目录”的操作入口。
- 文件树只支持向下展开，不支持快速返回当前目录的父级。
- 文件/文件夹节点没有右键菜单，无法触发下载或查看详情。
- renderer 目前不知道 SSH 终端当前工作目录，因此“文件树切到终端当前路径”还没有可用的数据来源。
- 项目已有共享右键菜单 host，但没有通用 modal/详情面板；Electron main 侧也尚未接入文件选择对话框。

本次设计要在不引入编辑器、批量传输队列或复杂连接池的前提下，把远程文件树从“只读浏览”扩展到“可执行基础文件工作流”。

## Goals / Non-Goals

**Goals:**
- 在路径栏下、文件树上新增固定工具栏，提供“终端切到文件树路径”“文件树切到终端路径”“上传文件”“刷新目录”四个动作。
- 让文件树始终围绕“当前浏览目录”工作，并在列表第一行固定显示“返回上一级”。
- 为文件与文件夹节点接入共享右键菜单，支持下载与查看详细信息。
- 为 SSH 终端补充当前工作目录同步能力，使文件树可以按需跳转到终端当前路径。
- 继续沿用 preload + IPC + main service 边界，renderer 不直接处理 ssh2 client 或本地文件系统写入。

**Non-Goals:**
- 不实现远程文件编辑、重命名、删除、新建目录、拖拽上传。
- 不实现批量上传、批量下载、传输队列、进度面板。
- 不实现长期 SFTP 连接池。
- 不改变 Terminal / Settings 主工作区结构，也不改变连接树图标语义。

## Decisions

### 1. 用终端 cwd 事件驱动“文件树切到终端路径”
- 决策：为终端链路新增“当前工作目录”运行时状态。main 侧在 shell 输出流中捕获 cwd 变化事件，并通过新的 terminal IPC 事件推送到 renderer；renderer 将 `ptyId` 与最近一次上报的 cwd 记录到 terminal store 的会话运行时状态中。
- 原因：文件树要切到“终端目前的路径”，必须有可靠的会话级 cwd 来源；仅靠 remote tree store 或连接配置无法推导当前 shell 所在目录。
- 实现取向：
  - SSH shell 启动后注入轻量 shell integration，为常见 POSIX shell 输出 OSC 7 cwd 标记。
  - `TerminalInstance` 在拿到 `ptyId` 后注册到 store，并订阅新的 cwd 事件。
  - Auxiliary Sidebar 从当前激活会话读取 `cwd`，点击“文件树切到终端路径”时调用 remote-files store 的 `loadPath`。
- 备选方案：
  - 每次点击时向终端注入 `pwd` 命令：会污染终端内容并打断用户输入，放弃。
  - 另起 SSH exec 会话查询目录：得到的是新会话默认目录，不是当前交互 shell 目录，放弃。

### 2. 远程文件树从“根目录缓存”升级为“当前目录 + 懒加载子树”模型
- 决策：保留每个 `connectionId` 的节点缓存，但新增 `currentPath` 作为当前浏览目录；根层列表始终显示当前目录的直接子项，并支持对子目录继续懒加载。父目录行由 renderer 合成，固定显示在列表第一行。
- 原因：用户请求中的“当前文件树路径”“返回上一级”都要求文件树具备明确的当前目录语义，而不是单纯展示首次加载的根目录。
- 影响：remote-files store 需要从 `ensureRootLoaded/refreshConnection` 扩展为 `loadPath/goToParent/refreshCurrentPath/uploadToCurrentPath` 等能力。
- 备选方案：
  - 彻底改成纯平铺列表，不再支持子目录展开：会回退当前已完成的懒加载树能力，放弃。
  - 只在 UI 层拼一个“..”项，但不改变 store 的当前目录模型：会让父级导航与刷新/上传目标目录脱节，放弃。

### 3. “终端切到文件树路径”通过已激活终端会话发送 `cd` 命令完成
- 决策：renderer 复用已有 `terminalApi.write`，向当前激活 SSH 会话对应的 `ptyId` 写入经过 POSIX 单引号转义的 `cd <path>` 命令。
- 原因：这是最小改动且符合当前终端架构的实现方式，不需要为单一动作再引入新的 main service 命令分发层。
- 影响：terminal store 需要记录 `sessionId -> ptyId` 的运行时映射，Auxiliary Sidebar 才能拿到当前激活终端实例。
- 备选方案：
  - 新增 `terminal:cd` IPC 并在 main 侧做会话路由：需要把 renderer 的 `sessionId` 与 main 的 `ptyId` 再做一层映射，改动更大，暂不采用。

### 4. 上传、下载与详情都走 main 侧对话框与 SFTP service
- 决策：
  - 上传：在 main 侧通过 `dialog.showOpenDialog` 选单个本地文件，再由 `SftpService` 上传到当前浏览目录。
  - 下载文件：通过 `dialog.showSaveDialog` 选择目标文件路径。
  - 下载文件夹：通过 `dialog.showOpenDialog` 选择目标本地目录，再由 `SftpService` 递归下载整个目录。
  - 详情：通过共享右键菜单触发 main 侧查询 `stat/lstat`，并用原生 message box 展示基础元信息。
- 原因：项目当前没有通用文件选择器或详情弹层，Electron 原生 dialog 是最小可行方案，也能避免 renderer 直接接触本地文件系统。
- 备选方案：
  - 在 renderer 内自建上传/下载/详情弹窗：需要额外状态管理与样式工作，超出本次范围。
  - 把本地路径选择交给用户手输：体验差且更容易出错，放弃。

### 5. 右键菜单复用现有 ContextMenuHost，不为父目录行提供菜单
- 决策：远程文件和目录节点的 `contextmenu` 事件接入 `useContextMenuStore`，菜单项固定为 `Download` 与 `Show Details`；合成的父目录行不提供右键菜单。
- 原因：共享右键菜单基础设施已经存在，复用它能保持交互一致性；父目录行不是实际远程条目，不应暴露下载/详情动作。
- 备选方案：
  - 给所有树行统一提供菜单：会让“返回上一级”这种虚拟项出现无意义动作，放弃。

## Risks / Trade-offs

- [SSH shell 未成功上报 cwd，导致“文件树切到终端路径”不可用] → 点击同步时显示明确错误，并保持文件树路径不变；后续再扩展更多 shell integration 兼容逻辑。
- [下载文件夹需要递归遍历，目录大时会明显变慢] → 第一阶段接受串行递归实现，不做后台队列；完成后统一刷新或提示结果。
- [上传到已存在的远程同名文件存在覆盖风险] → 初版默认不静默覆盖，若远端同名目标已存在则直接报错并保持目录不变。
- [原生 message box 展示详情不如自定义面板灵活] → 以最小改动先交付可用能力，后续若需要 richer metadata UI 再升级为 renderer 弹层。

## Migration Plan

1. 扩展 shared terminal / sftp 类型与 IPC channel，补充 cwd 事件、上传/下载/详情接口。
2. 在 main 侧为 SSH 终端增加 cwd 上报，为 SftpService 增加上传、递归下载、详情查询能力，并在 IPC handler 中接入 Electron dialog。
3. 在 renderer 侧扩展 terminal store 的会话运行时状态，并重构 remote-files store 为当前目录模型。
4. 更新 Auxiliary Sidebar 与 RemoteFileTree：新增工具栏、父目录行与右键菜单。
5. 运行 `npm run lint`、`npx tsc --noEmit`，再由用户手动用 `npm run dev` 验证 GUI。

## Open Questions

- 本次默认上传只支持单文件；若用户后续明确需要多文件上传，再在同一工作流上扩展多选与批量状态反馈。
