## 1. 终端 cwd 与 IPC 扩展

- [x] 1.1 扩展 shared terminal / ipc 类型，加入终端 cwd 事件与 SFTP 上传、下载、详情相关接口定义。
- [x] 1.2 在 main 侧 SSH 终端链路中上报当前工作目录变化，并通过 terminal IPC 转发到 renderer。
- [x] 1.3 在 preload 与 renderer terminal store 中记录会话的 ptyId 与最近一次 cwd，供辅助侧边栏读取。

## 2. SFTP 服务扩展

- [x] 2.1 为 SftpService 增加按指定路径加载目录、上传文件、下载文件/目录、查询远程详情的能力。
- [x] 2.2 在 main 侧接入 Electron 原生文件选择/保存对话框，并通过 SFTP IPC 暴露上传、下载、详情动作。

## 3. 远程文件树交互升级

- [x] 3.1 重构 remote-files store 为“当前目录 + 节点缓存”模型，支持跳转终端路径、返回上一级、刷新当前目录与上传后刷新。
- [x] 3.2 更新 AuxiliarySidebar，在路径栏下新增工具栏，并接入终端/文件树路径双向同步、上传、刷新操作。
- [x] 3.3 更新 RemoteFileTree，为当前目录非根场景渲染固定父目录行，并为文件/文件夹节点接入右键菜单。
- [x] 3.4 接入远程条目下载与详情查看交互，并确保取消对话框或失败场景不会破坏当前树状态。

## 4. 验证

- [x] 4.1 运行 `npm run lint` 与 `npx tsc --noEmit` 验证类型与静态检查。
- [x] 4.2 由用户手动运行 `npm run dev`，验证工具栏按钮、父目录导航、右键下载/详情与上传流程。
