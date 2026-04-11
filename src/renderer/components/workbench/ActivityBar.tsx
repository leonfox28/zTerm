import { useWorkbenchStore } from '../../stores/workbench.store'

export function ActivityBar() {
  const { activeViewId, sidebarVisible, setActiveView } = useWorkbenchStore()

  const items = [
    { id: 'terminal', icon: 'codicon-terminal', title: 'Terminal' },
    { id: 'connections', icon: 'codicon-remote-explorer', title: 'Remote Connections' }
  ]

  return (
    <div className="activitybar">
      <div className="activitybar__top">
        {items.map((item) => (
          <div
            key={item.id}
            className={`activitybar__item ${item.id === activeViewId && sidebarVisible ? 'activitybar__item--active' : ''}`}
            title={item.title}
            onClick={() => setActiveView(item.id)}
          >
            <i className={`codicon ${item.icon}`} />
          </div>
        ))}
      </div>
      <div className="activitybar__bottom">
        <div className="activitybar__item" title="Settings">
          <i className="codicon codicon-settings-gear" />
        </div>
      </div>
    </div>
  )
}
