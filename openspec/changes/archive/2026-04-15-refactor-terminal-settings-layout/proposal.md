## Why

当前工作台虽然已经把主视图收敛为 Terminal 与 Settings，但设置页仍然更像一个内嵌表单，而不是独立的工作台页面；同时活动栏只把 Terminal 作为主入口，Settings 仍停留在底部 gear 入口。这使页面层级、导航方式与布局结构都不够统一，也和持续参考的 VS Code 工作台体验存在偏差。

## What Changes

- 将 Terminal 与 Settings 明确为两个独立的工作台页面，并统一通过活动栏图标进行切换。
- 保持 Terminal 页面现有三栏内容布局不变：连接侧边栏、主终端区、辅助侧边栏；活动栏继续作为全局导航，不计入页面栏数。
- 将 Settings 页面重构为尽量贴近 VS Code 设置页的结构与视觉：顶部 header/search 区、左侧 TOC 导航、右侧 settings rows 内容区。
- 调整 Settings 页面导航交互，移除对页内返回按钮的依赖，改为以活动栏与既有键盘命令切换页面。

## Capabilities

### New Capabilities
- `workbench-page-navigation`: 定义 Terminal / Settings 作为独立工作台页面时的活动栏导航与页面级布局切换行为。

### Modified Capabilities
- `settings-view`: 调整设置页的进入方式与页面结构，使其符合独立页面和两栏设置布局。

## Impact

- 影响 renderer 侧 Workbench、ActivityBar、MainArea 与 workbench store 的页面切换状态管理。
- 影响 SettingsView 的结构与样式，需要新增左侧分类导航和右侧设置内容区。
- 需要补充新的 OpenSpec capability，并更新现有 `settings-view` capability 的页面进入与布局要求。
- 应继续参考本地 VS Code 工作台与设置页导航结构，但保持当前 React + Zustand + CSS variables 架构下的最小实现。
