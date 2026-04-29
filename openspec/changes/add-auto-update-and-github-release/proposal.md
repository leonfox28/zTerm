## Why

zTerm 目前只能通过源码开发运行或手工构建，没有面向用户的 GitHub 发布流程，也没有应用内更新能力。为了让用户安装后的版本能持续获得修复与新功能，需要补齐可发布安装包、更新元数据以及可控的自动更新体验。

## What Changes

- 新增基于 GitHub Releases 的桌面应用发布流程，产出安装包和自动更新所需 metadata。
- 新增应用启动时的更新检查；仅在 packaged app 中启用，开发模式不执行真实更新检查。
- 新增 Settings 中的 `Updates` 区域，支持用户手动点击检查更新并查看更新状态。
- 当检测到新版本时，先询问用户是否下载并安装；用户同意后才开始下载。
- 下载完成后再次提示用户重启安装，避免直接中断正在运行的终端会话。
- 更新检查、下载、安装状态通过 main / preload / renderer 的受控 IPC 链路同步，不把 updater 能力直接暴露给 renderer。
- 更新失败、无更新、取消下载、取消重启等情况应给出清晰反馈，并保持终端工作区可继续使用。

## Capabilities

### New Capabilities
- `application-update`: 定义应用启动检查、手动检查、用户确认下载、下载完成后重启安装、失败反馈与 packaged-only 行为。
- `github-release-distribution`: 定义 GitHub Releases 发布产物、更新 metadata、版本标签触发和发布前验证要求。

### Modified Capabilities
- `settings-view`: 新增 Settings 页面中的 `Updates` 分类和手动检查更新入口。

## Impact

- 影响 `package.json` 打包/发布脚本、Electron builder 配置、GitHub Actions release workflow、发布文档与 README。
- 新增 `electron-builder` / `electron-updater` 相关依赖与配置，并需要处理 macOS / Windows / Linux 产物差异。
- 影响 main process 服务注册、IPC channels、preload bridge、renderer store、Settings view、Status Bar 或更新确认 UI。
- 需要明确代码签名与 notarization 策略；未签名构建可用于内部验证，但公开发布体验会受到 macOS Gatekeeper 和 Windows SmartScreen 影响。
- 需要验证 packaged app 中本地 PTY、SSH/SFTP、更新检查、下载与重启安装流程，开发模式只能覆盖静态类型和 UI 状态逻辑。
