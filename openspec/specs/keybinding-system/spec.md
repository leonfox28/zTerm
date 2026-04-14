# keybinding-system Specification

## Purpose
Define the centralized renderer-side keybinding registry and scope rules used by workbench keyboard commands.
## Requirements
### Requirement: Workbench keybindings are registered through a centralized registry
The system SHALL define workbench keyboard shortcuts through a centralized renderer-side registry that maps normalized keybindings to command identifiers and handlers.

#### Scenario: Resolve a registered shortcut
- **WHEN** a keydown event matches a registered default keybinding
- **THEN** the system resolves that keybinding through the centralized registry
- **AND** invokes the command handler associated with the matching command identifier

### Requirement: Command execution honors view and focus scope
The system MUST evaluate command scope before executing a keybinding so shortcuts run only when the current workbench state allows them.

#### Scenario: Shortcut is ignored outside its allowed main view
- **WHEN** a keybinding is pressed for a command that requires the terminal main view while the settings view is active
- **THEN** the system does not execute that command

#### Scenario: Shortcut is ignored while editing a text input
- **WHEN** focus is inside a text input, textarea, select, or contenteditable control and a command disallows execution from text editing contexts
- **THEN** the system does not execute that command

### Requirement: Terminal focus uses an explicit shortcut allowlist
The system MUST avoid intercepting terminal keystrokes unless the matched command explicitly allows execution while the terminal surface is focused.

#### Scenario: Non-allowed command is skipped while terminal is focused
- **WHEN** focus is inside the terminal surface and the pressed keybinding maps to a command that is not allowed during terminal focus
- **THEN** the system leaves the event unhandled for terminal input processing

#### Scenario: Allowed command still executes while terminal is focused
- **WHEN** focus is inside the terminal surface and the pressed keybinding maps to a command marked as allowed during terminal focus
- **THEN** the system executes that command instead of ignoring it

### Requirement: Shared commands can be triggered from keyboard and mouse entry points
The system SHALL expose command handlers so the same workbench action can be invoked from keyboard shortcuts and existing UI controls.

#### Scenario: Existing UI control reuses command handler
- **WHEN** the user activates an existing workbench action button that also has a keyboard shortcut
- **THEN** the UI control calls the same underlying command handler used by the keybinding system
- **AND** the resulting behavior matches the keyboard-triggered action
