# zTerm

跨平台终端模拟器与 SSH 客户端，UI 接近 VS Code workbench。目标是轻量、聚焦：本地终端、SSH 会话、文件工作流。

## Features

- 本地 PTY 终端（`node-pty`、login shell、`xterm-256color`）
- SSH 终端（`ssh2`）与可保存连接（创建/编辑/删除、文件夹分组）
- 密码与私钥口令直接存入系统凭证库（macOS Keychain、Windows Credential Manager、Linux Secret Service）
- 多标签、分屏、拖拽调整；原生右键菜单
- Workbench：Activity Bar、连接侧栏、终端主区、Explorer 辅助侧栏、Status Bar、Settings
- 统一本地/SSH Explorer：浏览、上传、下载、详情；错误走 Status Bar
- 主题、终端字体、shell path、login shell、copy-on-selection
- GitHub Releases 自动更新（下载/重启前确认）
- 终端剪贴板与常用快捷键

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop | Electron 43 |
| UI | React 19 + TypeScript |
| Terminal | xterm.js v6 + node-pty |
| SSH / SFTP | ssh2 |
| State | Zustand |
| Persistence | electron-store + `@napi-rs/keyring` |
| Icons | `@vscode/codicons` |
| Build | electron-vite 5 + Vite 7 + electron-builder |

## Getting Started

需要 Node.js 22.12+ 与 npm：

```bash
npm install
npm run dev
```

macOS 上首次安装后，若本地终端起不来，给 `node-pty` helper 执行权限：

```bash
chmod +x node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper
```

在 Cursor agent 终端里启动时，若环境带有 `ELECTRON_RUN_AS_NODE=1`，需先去掉：

```bash
env -u ELECTRON_RUN_AS_NODE npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | 开发模式 |
| `npm run build` | 生产构建 |
| `npm run pack` | 构建当前平台未打包应用 |
| `npm run dist` | 构建当前平台安装包 |
| `npm run release` | 在有 `GH_TOKEN` 与 release tag 时发布 |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript 检查 |
| `npm run format` | Prettier 格式化 `src/` |

## Architecture

```text
Main (PTY / SSH / SFTP / store / menus)
              │ IPC + preload
Renderer (Zustand stores + React workbench/terminal/settings)
```

- Main 拥有进程、会话与系统凭证库访问；Renderer 和配置文件不持有凭证明文或密文
- Preload 暴露 `terminalApi`、`storeApi`、`connectionsApi`、`sftpApi`、`localFileTreeApi`、`clipboardApi`、`contextMenuApi`、`updateApi`
- 共享通道：`src/shared/ipc-channels.ts`
- SSH 启动使用已保存的 `connectionId`
- 右键菜单：Renderer 定义状态与动作，Main 弹出原生菜单

源码布局：`src/main`、`src/preload`、`src/renderer`、`src/shared`。

## Current Focus

已完成：本地终端、分屏、Settings、SSH 连接与会话、本地/远程 Explorer、基础上传下载。

下一步：传输队列、拖拽上传、进度、远程文件编辑；更远还有串口、RDP 等。

## Releases And Updates

发布用 `electron-builder` + GitHub Releases：

1. 更新 `package.json` 版本并提交
2. 推送匹配的 `v*` tag（如 `v0.1.1`）
3. GitHub Actions 校验 tag 与版本一致后打包上传

本地打包：

```bash
npm run lint && npm run typecheck && npm run build
npm run pack   # 未打包应用 → release/
npm run dist   # 安装包 → release/
```

公开分发前把品牌图标放到 `resources/`（`icon.icns` / `icon.ico` / `icons/*.png`），并在 `package.json` 的 `build` 里配置。签名与公证用 GitHub secrets（`CSC_LINK`、`CSC_KEY_PASSWORD`、`APPLE_ID` 等），不要提交到仓库；没有 secrets 时仍可打出未签名包做内测。

运行时行为：打包版启动后检查更新；开发模式不联网检查。Settings 有 Updates 分类。下载与重启安装前都会询问用户。

## Agent Context

- `AGENTS.md`：agent 约束与工作方式
- `.cursor/rules/`：Cursor 作用域规则
- 实现以 `src/` 为准

## References

- VS Code 参考源码：`/Users/huyuanzhe/prj-code/vscode`
- [xterm.js](https://xtermjs.org/) · [node-pty](https://github.com/microsoft/node-pty) · [ssh2](https://github.com/mscdex/ssh2) · [electron-vite](https://electron-vite.org/)
