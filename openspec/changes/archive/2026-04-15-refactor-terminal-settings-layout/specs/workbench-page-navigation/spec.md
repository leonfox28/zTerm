## ADDED Requirements

### Requirement: Activity Bar provides top-level workbench page navigation
The system SHALL present `Terminal` and `Settings` as the two top-level workbench pages in the Activity Bar, and switching between them SHALL update the main workbench page without introducing a secondary page entry pattern.

#### Scenario: Open terminal page from Activity Bar
- **WHEN** the user activates the `Terminal` item in the Activity Bar
- **THEN** the workbench displays the terminal page in the main area
- **AND** the `Terminal` Activity Bar item is shown in its active state

#### Scenario: Open settings page from Activity Bar
- **WHEN** the user activates the `Settings` item in the Activity Bar
- **THEN** the workbench displays the settings page in the main area
- **AND** the `Settings` Activity Bar item is shown in its active state

### Requirement: Terminal page preserves its three-column content layout
The system SHALL preserve the terminal page as a three-column content layout consisting of the primary sidebar, terminal main area, and auxiliary sidebar, while the Activity Bar remains global workbench chrome outside the page column count.

#### Scenario: Terminal page layout remains unchanged
- **WHEN** the terminal page is the active workbench page
- **THEN** the terminal page shows the primary sidebar, terminal main area, and auxiliary sidebar as its three content columns
- **AND** the Activity Bar remains visible as global navigation chrome

### Requirement: Settings page is a standalone page surface
The system SHALL treat the settings page as a standalone workbench page surface that does not include the terminal page's primary sidebar or auxiliary sidebar, and uses the main area for its own internal two-column layout.

#### Scenario: Settings page uses its own page surface
- **WHEN** the settings page is the active workbench page
- **THEN** the workbench shows the settings page next to the Activity Bar
- **AND** the terminal page's primary sidebar is not part of the settings page
- **AND** the terminal page's auxiliary sidebar is not part of the settings page

### Requirement: Top-level page switching keeps terminal sessions alive
The system MUST keep the terminal workspace mounted while switching between the terminal page and settings page so that existing PTY-backed terminal sessions remain alive.

#### Scenario: Return to terminal page after visiting settings
- **WHEN** at least one terminal session is open, the user opens the settings page, and then returns to the terminal page
- **THEN** the existing terminal session remains available
- **AND** switching pages does not implicitly kill or recreate that PTY session

### Requirement: Keyboard page navigation matches Activity Bar page switching
The system SHALL route existing workbench keyboard commands for opening settings and returning to terminal through the same top-level page switching model used by the Activity Bar.

#### Scenario: Keyboard shortcut opens settings page
- **WHEN** the user triggers the keyboard command that opens settings
- **THEN** the workbench switches to the settings page
- **AND** the `Settings` Activity Bar item becomes active

#### Scenario: Keyboard shortcut returns to terminal page
- **WHEN** the user triggers the keyboard command that returns from settings to terminal
- **THEN** the workbench switches to the terminal page
- **AND** the `Terminal` Activity Bar item becomes active
