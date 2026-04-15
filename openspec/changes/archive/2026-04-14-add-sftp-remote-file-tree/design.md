## Context

当前仓库已经完成 SSH 终端会话，但 `src/renderer/components/workbench/AuxiliarySidebar.tsx` 仍然是空壳，`docs/handoff.md`、`docs/project-plan.md` 与 `README.md` 都把它指定为下一阶段 SFTP 工作流的承载区域。现有 renderer 里最稳定的远程上下文来源不是额外的全局选择状态，而是 `src/renderer/stores/terminal.store.ts` 中当前激活 terminal session 已持有的 `connectionId`。

这次设计只做第一阶段：在辅助侧边栏显示当前激活 SSH tab 的只读远程文件树。约束包括：
- 不改变现有 Terminal / Settings 主页面结构。
- 不改变连接树图标语义；SFTP 错误只在辅助侧边栏内展示。
- 继续沿用 preload + IPC + main service 边界，renderer 不直接接触 SSH 凭据或 ssh2 client。
- 先优先正确性与最小改动，不提前引入上传/下载队列与连接池。

## Goals / Non-Goals

**Goals:**
- 基于已保存 SSH 连接，提供远程目录只读浏览能力。
- 在当前激活 SSH tab 时自动显示对应远程文件树；本地 terminal tab 时显示空态。
- 支持目录懒加载、刷新、基础错误展示。
- 复用现有 SSH 连接记录、凭据解析与 terminal session `connectionId`。

**Non-Goals:**
- 不实现上传、下载、拖拽、重命名、删除、新建目录。
- 不实现远程文件内容读取、Monaco 编辑或保存。
- 不实现 terminal 当前工作目录与文件树目录自动同步。
- 不实现长期复用的 SSH/SFTP 连接池。

## Decisions

### 1. 新增独立 `SftpService`，不把文件浏览职责合并进 `SshService`
- 决策：在 `src/main/services/sftp.service.ts` 中实现目录读取逻辑，`src/main/services/ssh.service.ts` 只提炼可复用的连接配置能力。
- 原因：当前 `SshService` 明确是 shell 会话模型（`spawn/write/resize/kill`），SFTP 的生命周期和返回数据不同，混在一起会让服务职责变得模糊。
- 备选方案：
  - 直接在 `SshService` 里新增 `listDirectory()`：短期可做，但会把 shell 与文件系统职责耦合。
  - 建新的通用 RemoteFsService：命名更抽象，但第一刀仍然只服务 SFTP，先保持简单。

### 2. 第一阶段按请求建立临时 SFTP 连接，而不是上来做连接池
- 决策：每次 `getInitialDirectory` / `listDirectory` 请求时建立 ssh2 client，打开 sftp，完成后立即关闭。
- 原因：当前目标只是打通只读树浏览；这样最少改动、易于保证资源释放，也不会把连接池、失效重连、多窗口共享这些复杂度提前引入。
- 备选方案：
  - 按 `connectionId` 缓存 client/sftp wrapper：后续上传下载阶段可能需要，但第一刀不是必须。

### 3. 远程文件树上下文绑定当前激活的 terminal session
- 决策：`AuxiliarySidebar` 通过 `activeTabId -> activePaneId -> sessionId -> sessions[sessionId].connectionId` 推导当前远程上下文。
- 原因：现有 terminal store 已经有 `connectionId`，避免引入第二套“当前选中远程连接”状态源。
- 备选方案：
  - 从左侧连接树单独维护当前连接：会与 active tab 上下文产生冲突。
  - 增加新的 activity view：会扩大这次改动范围。

### 4. 新增独立 renderer store 管理 remote file tree 缓存
- 决策：新增 `src/renderer/stores/remote-files.store.ts`，按 `connectionId` 缓存根目录、节点、展开状态、加载态与错误态。
- 原因：远程文件树属于业务状态，不应塞进 `workbench.store.ts` 这种布局状态容器。
- 备选方案：
  - 直接在 `AuxiliarySidebar` 里用组件 state 管理：不利于多连接缓存与切换复用。

## Risks / Trade-offs

- [按请求建连会增加目录展开延迟] → 第一阶段优先实现正确性，后续上传下载阶段再评估连接复用。
- [某些 SSH 服务端允许 shell 但禁用 SFTP] → 在辅助侧边栏明确展示错误，不污染连接树或终端状态。
- [目录很大时一次性 readdir 压力较大] → 初版先保持原始列表，后续如有必要再加分页/虚拟化。
- [当前文件树不跟随 shell cwd] → 在 spec 中明确这不是第一阶段目标，避免用户误解。

## Migration Plan

1. 为 change 补 proposal / design / spec / tasks。
2. 在 shared 层新增 SFTP IPC channel 与类型定义。
3. 提炼 SSH 连接配置逻辑，新增 main 侧 `SftpService` 与 IPC handler。
4. 在 preload 暴露 `sftpApi`。
5. 新增 renderer 侧 `remote-files.store.ts` 并接入 `AuxiliarySidebar.tsx`。
6. 通过 lint / tsc 与用户手动 GUI 验证确认 SSH tab 与本地 tab 的展示行为正确。

## Open Questions

- 初始目录优先使用 `realpath('.')` 还是 OpenSSH `expandPath('~')`；实现时可先优先尝试 home 解析，失败再回退 `/`。
- 第一阶段是否需要在 header 上展示当前连接名，还是仅显示固定标题；当前建议显示连接名以降低上下文切换成本。