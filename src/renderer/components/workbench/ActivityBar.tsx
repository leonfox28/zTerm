import { useWorkbenchStore, type MainViewId } from '../../stores/workbench.store'

const items: Array<{ id: MainViewId; icon: string; title: string }> = [
  { id: 'terminal', icon: 'codicon-terminal', title: 'Terminal' },
  { id: 'settings', icon: 'codicon-settings-gear', title: 'Settings' }
]

export function ActivityBar() {
  const { activeMainView, setActiveView } = useWorkbenchStore()

  return (
    <div className="activitybar">
      <div className="activitybar__top">
        {items.map((item) => (
          <div
            key={item.id}
            className={`activitybar__item ${item.id === activeMainView ? 'activitybar__item--active' : ''}`}
            title={item.title}
            onClick={() => setActiveView(item.id)}
          >
            <i className={`codicon ${item.icon}`} />
          </div>
        ))}
      </div>
    </div>
  )
}
