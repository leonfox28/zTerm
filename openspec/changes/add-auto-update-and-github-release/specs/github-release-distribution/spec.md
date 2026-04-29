## ADDED Requirements

### Requirement: Release workflow builds from version tags
The system SHALL provide a GitHub Actions release workflow that builds distributable zTerm artifacts from `v*` version tags.

#### Scenario: Version tag triggers release build
- **WHEN** a maintainer pushes a tag matching `vX.Y.Z`
- **THEN** the release workflow runs the project's verification and packaging steps
- **AND** the workflow targets the version represented by that tag

#### Scenario: Tag version must match package version
- **WHEN** the pushed release tag version does not match the `package.json` version
- **THEN** the release workflow fails before publishing release assets

### Requirement: Release workflow publishes installers and update metadata
The system SHALL publish platform installer artifacts and updater metadata to the matching GitHub Release.

#### Scenario: Release assets are uploaded
- **WHEN** the release workflow completes packaging successfully
- **THEN** the GitHub Release contains platform-specific installer artifacts
- **AND** the GitHub Release contains update metadata required by packaged clients

#### Scenario: Packaged clients can discover latest stable release
- **WHEN** a packaged zTerm client checks for updates
- **THEN** it uses the configured GitHub Releases provider to discover the latest stable release metadata

### Requirement: Release workflow verifies before publishing
The system MUST run project verification before publishing release artifacts.

#### Scenario: Static verification fails
- **WHEN** linting, type checking, bundling, or packaging fails during the release workflow
- **THEN** release assets are not published
- **AND** the workflow exits with a failure status

### Requirement: Release signing configuration is explicit
The system SHALL document and configure release signing and notarization inputs as repository secrets rather than hard-coding credentials.

#### Scenario: Signing secrets are configured
- **WHEN** required platform signing secrets are available in GitHub Actions
- **THEN** the release workflow can sign or notarize supported platform artifacts according to the release configuration

#### Scenario: Signing secrets are absent
- **WHEN** signing secrets are not configured
- **THEN** the release workflow either produces clearly documented unsigned artifacts for internal validation or skips the signing-dependent target
- **AND** no signing credential is committed to the repository

### Requirement: Release process is documented
The system SHALL document how maintainers create a GitHub release for zTerm.

#### Scenario: Maintainer prepares a release
- **WHEN** a maintainer wants to publish a new zTerm version
- **THEN** the documentation explains how to update the version, run verification, push the release tag, and locate the published artifacts
