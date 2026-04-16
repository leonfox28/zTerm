## Why

zTerm 当前右键菜单仍是 renderer 内自绘浮层，桌面观感与 VS Code/Electron 原生菜单不一致。与此同时，Explorer 在遇到无权限目录或其他文件树操作错误时会用错误消息覆盖整个文件树区域，导致用户无法继续浏览与恢复操作，因此需要补齐更符合桌面应用预期的菜单与错误反馈行为。

## What Changes

- 将 zTerm 的连接树、文件树、终端 pane 右键菜单从自绘 HTML 菜单切换为 Electron 原生菜单，并保持 renderer 负责菜单语义、main 负责系统菜单弹出的分层方式。
- 为右键菜单新增共享的序列化菜单模型、preload bridge 与 main IPC transport，支持菜单项、分隔线、快捷键展示与点击回传。
- 调整 Explorer 错误展示方式：访问无权限目录或执行下载/详情/上传等操作失败时，不再用错误消息覆盖整个文件树区域，而是在底部 StatusBar 显示错误提示，并保持文件树可继续操作。
- 为 Workbench 增加轻量的全局状态栏消息能力，用于承载 Explorer 相关错误提示。

## Capabilities

### New Capabilities
- `native-context-menu`: 定义连接树、文件树与终端 pane 使用系统原生右键菜单的用户可见行为，以及 renderer/main 分层下的点击回传方式。

### Modified Capabilities
- `local-terminal-file-tree`: 调整本地 Explorer 在权限错误等失败场景下的反馈方式，要求错误显示在 StatusBar 中而不是替换整个文件树区域。
- `sftp-remote-file-tree`: 调整远程 Explorer 的下载、详情、上传与目录读取失败反馈方式，要求错误不再覆盖整个文件树区域。

## Impact

- 影响 main / preload / renderer 的菜单 IPC 链路，需要新增原生菜单序列化模型与 Electron `Menu.popup()` 调用路径。
- 影响连接树、文件树、终端 pane 右键交互实现，需要把现有 closure 型菜单动作迁移到可序列化菜单请求与 renderer 本地 handler 执行器。
- 影响 Workbench 与 Explorer 错误展示，需要为状态栏增加全局消息状态，并调整 AuxiliarySidebar 的错误渲染分支。
- 不涉及新的外部依赖，但会修改现有 renderer/store/main IPC 代码路径与相关 OpenSpec 能力说明。