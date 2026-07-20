# zTerm Agent Instructions

Cursor 项目指令。产品说明与路线图见 `README.md`；作用域规则见 `.cursor/rules/`。
`src/` 与文档不一致时以代码为准。默认用中文回复。

## Commands

- `npm install` / `npm run dev` / `npm run build`
- `npm run lint` / `npm run typecheck` / `npm run format`

## Verification

- 改 TypeScript、React、IPC、preload、service 后优先跑 `npm run lint` 与 `npm run typecheck`
- 改 Electron/Vite 配置、preload/main 打包或跨进程导入时再跑 `npm run build`
- GUI 行为通常由用户用 `npm run dev` 手动验证；需要时说明

## Architecture

- Main 负责 PTY、SSH、SFTP、凭证、原生菜单与持久化
- Renderer 状态在 `src/renderer/stores/`（Zustand）
- Preload 桥接：`src/preload/index.ts`；共享 IPC/类型：`src/shared/`
- 凭证由 main 直接存入系统凭证库，不要放进配置文件或 renderer state
- 终端/会话逻辑与 workbench 布局逻辑分开

## UI

- 行为与视觉贴近 VS Code；参考本地仓库 `/Users/huyuanzhe/prj-code/vscode`
- 图标用 `@vscode/codicons`
- 保持 Activity Bar、连接侧栏、终端主区（tab 内 Explorer）、Status Bar、Settings
- SSH 创建/编辑是终端页 modal，不是独立顶层页
- 连接树图标只表示连接类型，不表示运行时状态
- SSH 失败写到终端输出；Explorer 失败走 Status Bar，文件树保持可用

## Working Style

- 先读周边代码，做最小改动；不顺手重构、不臆造功能
- 只改任务相关文件；清理自己改动产生的无用代码
- 不还原用户无关本地修改

## Git

- 非平凡改动在干净 worktree 上用 `feature/` / `fix/` / `chore/` 分支
- 有无关未提交改动时先问再切分支
- 提交格式：`<type>: <中文说明>`（`feat` | `fix` | `docs` | `refactor` | `chore`）
- 禁止 force push 与改写已推送历史
