# terminal-clipboard-actions Specification

## Purpose
Define terminal copy, paste, context menu clipboard actions, and copy-on-selection behavior.

## Requirements
### Requirement: Users can copy selected terminal text with keyboard or context menu
The system SHALL allow the user to copy the current terminal selection into the system clipboard from the active terminal pane.

#### Scenario: Copy selected text with keyboard shortcut
- **WHEN** the active terminal pane has a non-empty text selection and the user presses the default copy shortcut
- **THEN** the system copies the selected terminal text into the system clipboard
- **AND** the terminal does not forward that shortcut as terminal input

#### Scenario: Copy selected text from the context menu
- **WHEN** the active terminal pane has a non-empty text selection and the user chooses `Copy` from the terminal context menu
- **THEN** the system copies the selected terminal text into the system clipboard

#### Scenario: Copy shortcut is ignored without a selection
- **WHEN** the active terminal pane has no text selection and the user presses the default copy shortcut
- **THEN** the system does not execute a terminal copy action
- **AND** the clipboard contents are left unchanged by zTerm

### Requirement: Users can paste system clipboard text into the active terminal
The system SHALL allow the user to paste plain text from the system clipboard into the active terminal pane.

#### Scenario: Paste with keyboard shortcut
- **WHEN** the active terminal pane is available and the user presses the default paste shortcut
- **THEN** the system reads the current plain-text clipboard contents
- **AND** pastes that text into the active terminal pane

#### Scenario: Paste from the context menu
- **WHEN** the active terminal pane is available and the user chooses `Paste` from the terminal context menu
- **THEN** the system reads the current plain-text clipboard contents
- **AND** pastes that text into the active terminal pane

### Requirement: Terminal context menu exposes clipboard actions
The system SHALL include clipboard actions in the terminal pane context menu.

#### Scenario: Open terminal context menu with clipboard actions
- **WHEN** the user opens the context menu on a terminal pane
- **THEN** the menu includes `Copy` and `Paste` actions for that pane
- **AND** the `Copy` action is disabled when that pane has no current text selection

### Requirement: Terminal selection can copy directly to the clipboard when enabled
The system SHALL support an enabled-by-default setting that copies terminal selections directly to the system clipboard.

#### Scenario: Selection immediately copies while enabled
- **WHEN** the copy-on-selection setting is enabled and the user creates a non-empty selection in the active terminal pane
- **THEN** the system writes the selected terminal text to the system clipboard without requiring an explicit copy action

#### Scenario: Selection does not auto-copy while disabled
- **WHEN** the copy-on-selection setting is disabled and the user creates a non-empty selection in the active terminal pane
- **THEN** the system updates the terminal selection normally
- **AND** zTerm does not write the selected text to the system clipboard unless the user explicitly invokes copy
