## Why

zTerm 已经具备可用的 SSH 终端能力，但用户仍然无法在工作台中查看远程文件，这使“远程工作流”只完成了一半。当前布局里辅助侧边栏已经预留为未来 SFTP 区域，因此现在补上只读远程文件树，可以用最小闭环把 SSH 连接扩展为真正的远程工作入口。

## What Changes

- 新增基于已保存 SSH 连接的 SFTP 只读远程文件树浏览能力。
- 在 Terminal 工作区的辅助侧边栏中显示当前激活 SSH tab 对应连接的远程目录树。
- 支持根目录加载、目录懒加载展开、手动刷新，以及 loading / empty / error 状态展示。
- 明确第一阶段不包含上传、下载、拖拽、重命名、删除、远程编辑等写操作能力。

## Capabilities

### New Capabilities
- `sftp-remote-file-tree`: 定义辅助侧边栏中的远程文件树浏览行为、SSH tab 绑定关系与错误展示约束。

### Modified Capabilities
- None.

## Impact

- 影响 main 侧 SSH 凭据复用、SFTP 服务实现与新的 IPC handler。
- 影响 preload bridge，需要新增面向 renderer 的 `sftpApi`。
- 影响 renderer 侧辅助侧边栏与远程文件树状态管理。
- 继续复用现有 `ssh2` 依赖、保存连接模型与 terminal session 的 `connectionId` 上下文。