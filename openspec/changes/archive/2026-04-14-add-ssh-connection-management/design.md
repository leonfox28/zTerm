## Context

zTerm 当前已经有可工作的本地终端、多 tab、多分屏、设置页、快捷键系统，以及基于 `electron-store` 的 `connections` / `connectionFolders` schema 定义，但真正接上的只有连接文件夹初始化，连接项与 SSH 会话链路尚未落地。现有连接树点击行为仍然只是打开本地终端，说明 UI、数据模型与终端服务抽象还没有被真正打通。

这次设计要同时覆盖“连接管理”和“SSH 终端连接”两层能力：一层是用户能够创建、编辑、删除并分组管理 SSH 连接；另一层是用户能够从这些连接项真正发起远程终端会话。因为这条链路会同时穿过 renderer、preload、main、终端服务抽象与本地安全存储，所以需要在实现前把边界、依赖和安全策略写清楚。

约束包括：
- 继续沿用当前 React + Zustand + Electron + preload bridge 架构，不推翻现有 terminal/store 组织方式。
- UI 设计继续参考本地 VS Code 源码思路，但以 zTerm 的轻量实现为主。
- 密码与私钥 passphrase 不能明文持久化，必须优先使用 Electron `safeStorage`。
- 私钥内容不进入 store，只保存文件路径；真正连接时由 main 侧读取。
- 当前已有 `inversify` 依赖但尚未接入，是否在本次就完成完整 DI 容器应以“能否最小闭环落地 SSH”优先，而不是为了架构纯度强行扩大范围。

## Goals / Non-Goals

**Goals:**
- 建立可持久化的 SSH 连接数据模型，支持基本的新增、编辑、删除、归类到文件夹。
- 提供从 Sidebar 发起的 SSH 连接配置 UI，并能在工作区中完成连接信息编辑。
- 引入 SSH 终端服务，使连接树中的 SSH 项可以打开远程终端会话，而不是继续复用本地 PTY。
- 使用 Electron `safeStorage` 处理密码与 passphrase 的保存与读取失败边界。
- 在 Sidebar 中表达连接状态的基础信息，例如 idle / connecting / connected / error。

**Non-Goals:**
- 不在本次实现 SFTP、远程文件树或文件传输。
- 不实现完整的自动重连策略与复杂状态机，只保留基础失败反馈与可扩展状态位。
- 不实现跨设备同步或凭据同步。
- 不在本次引入完整的用户自定义 SSH 配置解析（如 ssh config include、proxyjump 等高级特性）。

## Decisions

### 1. 连接管理与 SSH 会话放在同一个 change 中落地
- 决策：本次 change 同时覆盖连接 CRUD、凭据存储和真实 SSH 终端会话，而不是只做连接管理 UI。
- 原因：如果只做连接表单和持久化，用户仍然不能真正使用 SSH，产品闭环不完整；而 handoff 的优先项本身就是“SSH 连接管理”，应优先交付可用的远程连接能力。
- 备选方案：
  - 只做连接管理，不做远程会话：范围更小，但用户价值不够。
  - 直接把 SSH + SFTP 一起做：范围过大，不利于当前阶段推进。

### 2. 维持现有 terminal IPC 模型，新增“连接描述驱动”的 SSH 会话创建入口
- 决策：保留当前 `terminalApi.create()` / `ITerminalService` 的主干思路，但为 SSH 场景新增基于 connection id 或 SSH options 的创建路径，由 main 侧决定是走 PtyService 还是 SshService。
- 原因：这样可以复用现有 TerminalInstance、TerminalPanel 和数据/退出事件通路，避免为 SSH 单独造一套 renderer 终端组件。
- 备选方案：
  - 完全拆成另一套 SSH terminal API：重复度高。
  - 在 renderer 直接处理 ssh2：违背 Electron 进程边界，也不安全。

### 3. 连接配置 UI 放在主工作区，不使用系统弹窗
- 决策：复用已有 main area view 模型，在主工作区展示 SSH 连接创建/编辑表单，而不是原生 modal。
- 原因：当前 SettingsView 已经证明主工作区切换方案可行，也更接近 VS Code 侧边栏 + 主区详情编辑的体验。
- 备选方案：
  - 原生弹窗：实现快，但不利于后续扩展连接详情页。
  - 侧边栏内嵌表单：空间太挤，不适合 SSH 配置编辑。

### 4. 凭据安全由 main 侧负责，renderer 永不接触解密逻辑
- 决策：renderer 只提交原始输入与“是否保存”意图，真正的加密/解密、safeStorage 可用性判断和私钥文件读取都放在 main/preload bridge 背后。
- 原因：凭据安全属于系统边界，必须留在 main 侧；同时可以避免 renderer store 中混入设备绑定的解密细节。
- 备选方案：
  - renderer 直接存明文：不安全。
  - renderer 调 safeStorage：不符合进程边界。

### 5. Sidebar 连接树在本次先支持单层文件夹 + 连接状态展示，嵌套能力保留在数据模型中
- 决策：数据模型继续保留 `parentId`/folder 方向，但本次 UI 行为优先支持“文件夹 + 连接项”基础管理和状态图标，不强行一次做完复杂嵌套拖拽。
- 原因：当前 store 和 handoff 都说明嵌套还未真正闭环，先把 SSH 主路径打通更有价值。
- 备选方案：
  - 立即实现完整嵌套树和拖拽排序：工作量大，会分散 SSH 连接主线。

## Risks / Trade-offs

- [safeStorage 在某些环境不可用] → 明确“不保存密码类字段但仍可连接”的降级路径，并向用户显示原因。
- [SSH 服务接入改动 terminal 抽象时引发本地终端回归] → 保持本地 PTY 路径不变，只在 main 侧新增分流和新服务实现。
- [连接表单与工作区切换让主区状态变复杂] → 沿用 settings view 的主区 view 模式，不把编辑态混进 sidebar 状态。
- [一次同时做管理与连接范围偏大] → 通过 tasks 分组控制：先打通 store/UI，再接 SSH service，再补验证。
- [密码/密钥路径模型后续可能还要扩展] → 保持字段与 shared types 对齐，优先满足 password/privateKey 两种基础认证方式。

## Migration Plan

1. 扩展 shared types、store schema 使用方式和 preload/main bridge，使连接项能够完整持久化。
2. 在 renderer 中实现连接管理 store 与主工作区 SSH 连接编辑视图，接入 Sidebar 新建/编辑入口。
3. 在 main 侧引入 SSH 运行时依赖、safeStorage 处理与 SshService，实现远程终端会话创建。
4. 将连接树点击行为区分为本地终端与 SSH 连接两类入口，并展示基础连接状态。
5. 通过 lint、tsc 与用户手动 GUI 验证确认创建/编辑/连接/失败反馈主路径可用。

## Open Questions

- 这次是否要同步引入完整的 DI 容器，还是先在现有 main 侧注册里做最小服务分流。
- SSH 表单是单独的“新建连接页 + 编辑连接页”，还是统一用一个复用表单组件承载两种模式。
- 初版是否需要支持 known_hosts 指纹确认，还是先依赖 ssh2 默认能力并在后续补足。