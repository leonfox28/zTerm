## Why

zTerm 已经具备 SSH 终端与只读 SFTP 文件树，但远程文件工作流仍停留在“看得到、操作不了”的阶段。当前辅助侧边栏已经是远程文件入口，因此现在补齐路径同步、上传、下载与详情查看，可以让 SSH 会话更接近可用的日常远程运维体验。

## What Changes

- 将远程文件树顶部操作区调整为独立工具栏，提供 4 个动作：把终端切换到当前文件树路径、把文件树切换到当前终端路径、上传文件到当前目录、刷新当前目录。
- 在文件树列表第一行固定提供“返回上一级”项，用于进入当前目录的父目录。
- 为文件与文件夹节点增加右键菜单，支持下载与查看详细信息。
- 扩展 SFTP 工作流为可执行基础文件传输操作，不再局限于只读浏览。

## Capabilities

### New Capabilities
- `sftp-file-transfer-actions`: 定义远程文件树中的上传、下载与文件详情查看行为。

### Modified Capabilities
- `sftp-remote-file-tree`: 扩展远程文件树的顶部操作区、父目录导航，以及文件树与终端工作目录之间的同步行为。

## Impact

- 影响 main 侧 SFTP service 与 IPC，需要补充上传、下载、stat/详情以及终端 cwd 查询/切换相关能力。
- 影响 preload bridge，需要暴露新的 SFTP 与终端协同接口给 renderer。
- 影响 renderer 侧 Auxiliary Sidebar、RemoteFileTree、共享右键菜单与远程文件状态管理。
- 需要继续参考本地 VS Code 文件资源管理器与 context menu 交互，但保持符合当前 React + Zustand 架构的最小实现。
