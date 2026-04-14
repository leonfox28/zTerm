## Why

zTerm 的产品目标本身就包含“远程连接管理”，但当前仓库里真正落地的只有本地终端与连接文件夹骨架，`connections` schema 与 Sidebar 连接树还没有形成完整的 SSH 连接管理闭环，也还不能真正发起 SSH 终端会话。现在继续推进 SSH 连接及连接管理，可以把现有的存储模型、Workbench 主区架构、Sidebar 入口与终端服务抽象接起来，让用户第一次在 zTerm 里保存并打开远程 SSH 终端。

## What Changes

- 新增 SSH 连接管理能力，定义连接项的创建、保存、编辑、删除与分组展示行为。
- 新增连接配置 UI 流程，包括从 Sidebar 发起新建 SSH 连接、填写配置表单并保存到持久化 store。
- 新增 SSH 终端会话能力，使用户可以从连接树发起 SSH 连接并在现有终端工作区中打开远程会话。
- 定义 SSH 凭据的存储边界与安全要求，包括密码/passphrase 的安全保存策略和 private key 路径处理。
- 规定连接状态、连接失败与重连前置反馈在 Sidebar 和终端 UI 中的基本展示规则。

## Capabilities

### New Capabilities
- `ssh-connection-management`: 定义 SSH 连接项的数据模型、持久化、分组管理以及创建/编辑/删除行为。
- `ssh-connection-ui`: 定义 Sidebar 与主工作区中的 SSH 连接配置和连接发起交互。
- `ssh-terminal-sessions`: 定义基于 SSH 的远程终端会话创建、输出转发与基础错误反馈行为。
- `ssh-credential-storage`: 定义 SSH 密码、私钥路径与 passphrase 的安全存储规则及失败边界。

### Modified Capabilities
- None.

## Impact

- 影响 renderer 侧 `connections.store`、连接树 UI、主工作区视图切换、连接表单交互以及终端创建入口。
- 影响 main/preload/store 链路，需要完整使用现有 `connections` / `connectionFolders` schema，并补齐凭据安全与 SSH 会话创建相关 bridge。
- 影响终端服务抽象，需要在现有 `ITerminalService`/terminal IPC 模型上扩展本地 PTY 与 SSH 会话两类创建路径。
- 预期会引入 SSH 相关运行时依赖与 Electron 安全存储能力。