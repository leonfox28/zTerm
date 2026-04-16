## 1. 原生右键菜单迁移

- [x] 1.1 新增共享的 context menu 序列化类型、IPC channels、preload bridge 与 main 侧 Electron native menu transport。
- [x] 1.2 新增 renderer 侧 native context menu 执行器，并将连接树、文件树与终端 pane 的右键菜单切换到原生菜单。
- [x] 1.3 移除旧的自绘 ContextMenuHost、context-menu store 与关联样式引用。

## 2. Explorer 错误改为状态栏展示

- [x] 2.1 为 Workbench 增加全局状态栏消息状态，并在 StatusBar 中渲染 Explorer 错误消息。
- [x] 2.2 调整 Explorer 错误处理链路，使本地/远程文件树失败时把错误同步到底部 StatusBar，而不是覆盖文件树区域。
- [x] 2.3 调整 AuxiliarySidebar 渲染逻辑，使文件树在权限错误、目录读取失败、下载/详情/上传失败后仍保持可继续操作。

## 3. 验证

- [x] 3.1 运行 `npm run lint` 与 `npm run typecheck` 验证静态检查与类型正确性。
- [x] 3.2 由用户手动运行 `npm run dev`，验证原生右键菜单行为，以及 Explorer 错误在 StatusBar 展示且文件树不被覆盖。