import { ConnectionTree } from '../sidebar/ConnectionTree'

function handleNewConnection() {
  // TODO: later this will open a dialog to choose connection type
  window.dispatchEvent(new CustomEvent('zterm:new-terminal'))
}

export function Sidebar() {
  return (
    <div className="sidebar">
      <div className="sidebar__header">
        <span className="sidebar__title">Connections</span>
        <div className="sidebar__actions">
          <div className="sidebar__action" title="New Connection" onClick={handleNewConnection}>
            <i className="codicon codicon-plus" />
          </div>
        </div>
      </div>
      <div className="sidebar__content">
        <ConnectionTree />
      </div>
    </div>
  )
}
