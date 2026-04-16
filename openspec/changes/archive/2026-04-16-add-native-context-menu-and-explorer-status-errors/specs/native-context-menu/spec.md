## ADDED Requirements

### Requirement: Workbench surfaces SHALL use Electron native context menus
The system SHALL use Electron native context menus for right-click actions in the connection tree, Explorer file tree, and terminal pane surfaces instead of rendering a custom HTML context menu overlay.

#### Scenario: User opens a connection tree context menu
- **WHEN** the user right-clicks a saved connection in the connection tree
- **THEN** the system opens a native context menu at the pointer location
- **AND** the menu includes the actions available for that connection

#### Scenario: User opens a terminal pane context menu
- **WHEN** the user right-clicks a terminal pane
- **THEN** the system opens a native context menu at the pointer location
- **AND** the menu reflects the current terminal pane state for enabled or disabled actions

### Requirement: Native context menu actions SHALL execute renderer-owned workbench behavior
The system MUST keep menu action semantics in the renderer and use the main process only to display the native menu and report user selection.

#### Scenario: User selects a native menu action
- **WHEN** the user selects an item from a native context menu
- **THEN** the main process reports the selected item back to the renderer
- **AND** the renderer executes the corresponding workbench action for that surface context

#### Scenario: Native menu transport does not own business logic
- **WHEN** a native context menu is shown or dismissed
- **THEN** the main process only handles menu popup and selection transport
- **AND** it does not directly mutate renderer business state for connection, explorer, or terminal actions
