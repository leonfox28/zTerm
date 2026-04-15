import { openSshConnectionCommand } from '../../commands/workbench.commands'
import { ConnectionTree } from '../sidebar/ConnectionTree'
import { WorkbenchPane } from './WorkbenchPane'

function handleNewConnection() {
  openSshConnectionCommand()
}

export function Sidebar() {
  return (
    <WorkbenchPane
      variant="primary"
      title="Connections"
      headerActions={
        <button className="workbench-pane__icon-button" onClick={handleNewConnection} title="New Connection" type="button">
          <i className="codicon codicon-plus" />
        </button>
      }
      contentClassName="sidebar__content"
    >
      <ConnectionTree />
    </WorkbenchPane>
  )
}
