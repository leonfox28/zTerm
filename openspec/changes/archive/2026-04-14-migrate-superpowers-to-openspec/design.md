## Context

zTerm 当前已经完成本地终端、分屏、共享右键菜单、主题 token 与 `electron-store` 持久化基础设施，且已有一套基于 Superpowers 的规划资产，主要位于 `docs/superpowers/`，补充背景位于 `docs/handoff.md`。现在项目希望停止继续扩展 Superpowers 体系，改为统一用 OpenSpec 承载后续 proposal、design、specs、tasks，再通过 `/opsx:apply` 进入实现。

本次迁移不是把历史文档逐字复制，而是把仍然有效、会影响后续实现的内容重组为 OpenSpec 可消费的 artifacts。当前最明确、最接近实现阶段的主题是“基础设置页”，因此本次 change 需要同时承接两类信息：一类是流程治理层面的规划入口切换，另一类是 settings view 的产品与技术方案。

约束包括：
- 继续以 `docs/handoff.md` 中的当前阶段、协作模式与验证方式为背景约束。
- 历史 `docs/superpowers/` 文档保留为迁移输入，不再作为唯一真相源。
- zTerm 的 UI/交互继续参考本地 VS Code 源码思路，但用当前 React + Zustand + CSS variables + Electron 架构轻量实现。
- 当前协作模式仍然是 Claude 负责规划/审查，Codex 负责后续代码编辑。

## Goals / Non-Goals

**Goals:**
- 用一个 OpenSpec change 统一承载“从 Superpowers 切换到 OpenSpec”的背景、边界和后续执行入口。
- 将“基础设置页”从历史 Superpowers 规划迁移为 OpenSpec 中可执行的规格与任务分解。
- 明确历史文档、交接文档和 OpenSpec artifacts 的角色，减少后续实现阶段的信息分叉。
- 为后续 `/opsx:apply` 提供完整、可落地的 proposal、design、specs、tasks。

**Non-Goals:**
- 不删除 `docs/superpowers/` 历史文件。
- 不在本次 change 中直接实现设置页代码或修改运行时行为。
- 不一次性把所有历史规划（如快捷键、SSH、未来插件系统）全部迁移进 OpenSpec。
- 不重写 `docs/handoff.md` 的全部内容；它仍然保留为面向新上下文的交接入口。

## Decisions

### 1. 采用“单一迁移 change + 多 capability specs”的组织方式
- 决策：创建一个 `migrate-superpowers-to-openspec` change，在其中同时描述流程治理能力与 settings view 能力。
- 原因：用户当前目标不是只做文档搬运，而是要把现有开发上下文切换到 OpenSpec，并让最接近落地的设置页方案进入新流程。把两部分拆成多个 change 会增加切换成本，也不利于当前一次性完成 `/opsx:propose` 产物。
- 备选方案：
  - 只迁移流程治理，不带 settings view：会导致后续仍需再补一次 settings 相关 OpenSpec artifacts。
  - 为 settings view 单独建 change：边界更纯，但会把“切换规划体系”的背景与“当前要实现什么”分裂成两个入口。

### 2. 历史 Superpowers 文档保留，但降级为参考输入
- 决策：保留 `docs/superpowers/`，但在 OpenSpec 中明确其角色是 migration input / historical reference，而不是实现前的主规范。
- 原因：这些文档仍然包含已验证的设计思路，直接删除会丢失背景；但若继续与 OpenSpec 并行作为主来源，会再次形成双轨规范。
- 备选方案：
  - 立即删除 Superpowers 文档：过于激进，且丢失历史背景。
  - 继续允许两套体系并行：会让后续实现阶段出现“以哪份文档为准”的歧义。

### 3. 设置页规格以“行为规范”重写，而不是复制旧实现步骤
- 决策：在 specs 中使用 OpenSpec requirement/scenario 形式重新表达设置页的用户可见行为、持久化规则与 runtime 生效边界，而不是照抄 Superpowers plan 中的逐步实现说明。
- 原因：OpenSpec 的 specs 需要描述系统应做什么，方便后续归档、测试映射和演进；实现细节则保留在 design/tasks 中。
- 备选方案：
  - 直接复制原计划步骤到 spec：会让 spec 混入过多实现细节，降低可测试性。

### 4. 本次 tasks 聚焦“让 settings view 可进入实现状态”
- 决策：tasks 只覆盖实现基础设置页所需的关键代码路径和验证步骤，同时补一个小范围文档/流程收尾任务，用来确认 OpenSpec 成为后续主入口。
- 原因：`applyRequires` 只要求到 `tasks`，因此任务拆分应直接服务即将开始的实现，而不是继续做泛化治理工作。
- 备选方案：
  - 把所有未来迁移动作都写进 tasks：会让当前实现入口过宽，削弱 tasks 的执行价值。

## Risks / Trade-offs

- [历史文档与 OpenSpec 表述不完全一致] → 在 OpenSpec 中以当前 handoff 与最新 superpowers 基础设置页文档交叉校准，只保留仍然有效的决策。
- [流程治理 capability 过于抽象，难以验证] → 将其收敛到可操作要求：后续实现前以 OpenSpec artifacts 为主、历史文档仅作参考输入。
- [单个 change 同时包含流程迁移与设置页，范围偏大] → 通过 capability 拆分与 tasks 分组控制清晰度，确保 `/opsx:apply` 时仍能按 settings view 实施。
- [后续项目若继续迁移更多历史规划，当前 change 可能不够完整] → 明确本次只迁移当前最相关的 settings view 与治理边界，其余主题按需要后续新增 change。

## Migration Plan

1. 创建 OpenSpec change，并以历史 `docs/superpowers/` 与 `docs/handoff.md` 作为输入整理 proposal/design/specs/tasks。
2. 在本次 change 中明确后续实现前应优先读取 `openspec/changes/migrate-superpowers-to-openspec/` 下 artifacts。
3. 保留 `docs/superpowers/` 作为历史资料，不执行删除或改写。
4. 后续由 `/opsx:apply` 根据本 change 的 tasks 进入实现，实际代码以 OpenSpec 产物为准推进。
5. 若后续验证 OpenSpec 工作流稳定，再按主题逐步把其它历史规划迁移为新的 change，而不是继续往 `docs/superpowers/` 增量写入。

## Open Questions

- 当前是否需要在后续单独补一个 docs 更新任务，明确仓库内“OpenSpec 是规划主入口”的说明位置。
- `planning-governance` capability 后续是否需要沉淀为长期 spec（归档后进入 `openspec/specs/`），还是仅作为这次迁移 change 的过渡约束。
