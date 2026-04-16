## Why

zTerm 目前只在 SSH 会话下提供辅助侧边栏文件树，而本地终端仍然停留在空态，这让本地工作流与远程工作流在同一工作台中的体验明显断裂。既然当前终端架构已经具备活跃 session、cwd 同步与辅助侧边栏容器，现在补齐本地终端文件树，能够把日常本地浏览、路径切换与后续文件操作能力统一到同一套 VS Code 风格入口里。

## What Changes

- 将辅助侧边栏文件树明确收敛为同一个 Explorer 功能，在本地 terminal session 与 SSH terminal session 下分别接入不同的数据源。
- 新增基于当前激活本地终端 session 的本地文件树能力，在辅助侧边栏展示当前目录内容，并与本地终端 cwd 保持双向同步。
- 最大化复用现有 SSH 文件树的树节点结构、工具栏交互、父目录导航、错误态与终端 session 运行时模型，避免新增一套平行的本地文件树实现。
- 调整现有远程文件树规范，使辅助侧边栏按 active session 类型切换同一 Explorer 的本地/远程 provider，而不再把本地终端固定视为空态。

## Capabilities

### New Capabilities
- `local-terminal-file-tree`: 定义本地终端在辅助侧边栏中的文件树展示、目录读取、父级导航与终端路径同步行为。

### Modified Capabilities
- `sftp-remote-file-tree`: 调整辅助侧边栏按 session 类型切换文件树的行为，使 SSH 会话继续显示远程文件树，而本地会话不再显示固定空态。

## Impact

- 影响 main 侧文件树数据源能力，需要在现有 SFTP 文件树体系旁新增本地 filesystem provider / service，并与 `node-pty` 本地 session 对齐。
- 影响 preload bridge 与 shared 类型，需要为统一 Explorer 暴露本地目录读取接口，同时保持远程接口可复用。
- 影响 renderer 侧 AuxiliarySidebar、文件树状态模型与组件边界，需要从“仅远程文件树”演进到“同一 Explorer + 不同 provider”。
- 需要继续参考 VS Code Explorer 的标题、刷新/折叠骨架与树交互，但保持当前 React + Zustand + CSS variables 的最小实现。
