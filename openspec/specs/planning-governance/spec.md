# planning-governance Specification

## Purpose
Define OpenSpec as the primary planning source for new implementation work while keeping historical Superpowers documents as background reference only.
## Requirements
### Requirement: OpenSpec becomes the primary planning artifact source for new implementation work
The project SHALL use OpenSpec change artifacts as the primary planning source for new implementation work once this migration change is adopted.

#### Scenario: Preparing to implement a planned feature
- **WHEN** a contributor is ready to start implementing work covered by this migration
- **THEN** they use the OpenSpec change artifacts under `openspec/changes/` as the main source of proposal, design, specs, and task sequencing

### Requirement: Historical Superpowers documents remain available as migration inputs only
The project MUST retain existing `docs/superpowers/` documents as historical reference material, but they MUST NOT be treated as the primary source for newly started implementation after the migration.

#### Scenario: Reviewing historical planning context
- **WHEN** a contributor needs background from prior planning work
- **THEN** they may read the relevant `docs/superpowers/` documents as historical context
- **AND** implementation decisions for newly started work are derived from the corresponding OpenSpec artifacts

### Requirement: Current handoff context is preserved during the migration
The migration SHALL preserve the currently relevant project handoff context by carrying forward active phase status, collaboration constraints, and near-term priorities into the OpenSpec planning flow.

#### Scenario: Starting work in a fresh planning context
- **WHEN** a contributor resumes work after the migration using the latest OpenSpec change
- **THEN** the OpenSpec artifacts include the active project state and constraints needed to continue work without depending solely on legacy Superpowers plans

### Requirement: Implementation-ready artifacts must exist before apply
The planning workflow MUST produce implementation-ready OpenSpec artifacts, including proposal, design, specs, and tasks, before implementation begins through the OpenSpec apply flow.

#### Scenario: Change is prepared for implementation
- **WHEN** a contributor runs the proposal flow for a migration-backed change
- **THEN** the change includes completed proposal, design, specs, and tasks artifacts required by the schema before implementation starts

