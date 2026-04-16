## 1. Main 侧 Explorer provider 基础设施

- [x] 1.1 扩展 shared 类型、IPC channels 与 preload bridge，新增本地文件树目录读取接口定义，并与现有远程文件树接口保持可统一建模。
- [x] 1.2 在 main 侧新增本地 filesystem provider / service，提供初始目录读取、按路径读取目录与本地条目类型映射能力。
- [x] 1.3 为本地终端启动链路补充 cwd 上报所需的 shell integration 接入，保证统一 Explorer 能持续拿到本地 session cwd。

## 2. Renderer 侧统一 Explorer 状态与界面

- [x] 2.1 将现有远程文件树 store 演进为统一 Explorer store，支持按 provider/context 加载当前目录、父目录导航、懒加载展开、刷新与跟随终端路径。
- [x] 2.2 复用现有树样式与工具栏模式，抽出统一 Explorer 列表、路径栏与错误/空态展示，并根据 provider capability 控制动作显示。
- [x] 2.3 更新 AuxiliarySidebar，按激活 session 类型选择本地或 SSH provider，并复用同一 Explorer 入口而不是两套文件树实现。

## 3. 验证

- [x] 3.1 运行 `npm run lint` 与 `npm run typecheck` 验证类型与静态检查。
- [x] 3.2 由用户手动运行 `npm run dev`，验证本地终端下的文件树展示、目录切换、父级导航与终端路径同步。
