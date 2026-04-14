## Why

zTerm 之前的规划与设计依赖 `docs/superpowers/`，但当前希望统一切换到 OpenSpec，避免后续规划、设计、任务拆解继续分散在两套体系中。现在切换可以把已有的交接背景、当前优先级和基础设置页方案一起沉淀到 OpenSpec，作为后续实现与协作的唯一规范入口。

## What Changes

- 将当前基于 Superpowers 的规划上下文迁移到 OpenSpec change 中，明确后续以 `openspec/` 为主。
- 把 `docs/handoff.md` 中与当前阶段、协作约束、下一步优先级相关的有效信息纳入本次变更背景。
- 将已完成的“基础设置页”规划从 `docs/superpowers/` 迁移为 OpenSpec 能消费的 proposal / design / specs / tasks artifacts。
- 明确 `docs/superpowers/` 历史文档保留为参考输入，不再作为后续实现决策的主来源。

## Capabilities

### New Capabilities
- `settings-view`: 在主工作区提供 VS Code 风格的设置页，支持主题、终端字体、shell 路径与 login shell 等基础设置，并定义这些设置的持久化与生效规则。
- `planning-governance`: 将项目规划流程切换为 OpenSpec，定义后续规划 artifacts 的主来源、历史 Superpowers 文档的定位，以及实现前所需的规范化产物。

### Modified Capabilities
- None.

## Impact

- 影响规划与实现入口：`openspec/changes/` 将成为后续实现前的主要规范位置。
- 影响参考文档：`docs/handoff.md`、`docs/superpowers/` 将作为迁移输入与历史参考。
- 影响后续代码实现范围：设置页相关 renderer/main/shared 模块需要以 OpenSpec 中的 design/specs/tasks 为准推进。
- 不引入新的运行时依赖；主要新增 OpenSpec artifacts，并为后续 `/opsx:apply` 提供实现依据。
