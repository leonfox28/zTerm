import { useWorkbenchStore, type MainViewId } from '../../stores/workbench.store'

const topItems: Array<{ id: MainViewId; icon: string; title: string }> = [
  { id: 'terminal', icon: 'codicon-terminal', title: 'Terminal' }
]

const bottomItems: Array<{ id: MainViewId; icon: string; title: string }> = [
  { id: 'settings', icon: 'codicon-settings-gear', title: 'Settings' }
]

export function ActivityBar() {
  const activeMainView = useWorkbenchStore((state) => state.activeMainView)
  const setActiveView = useWorkbenchStore((state) => state.setActiveView)

  const renderItem = (item: { id: MainViewId; icon: string; title: string }) => (
    <div
      key={item.id}
      className={`activitybar__item ${item.id === activeMainView ? 'activitybar__item--active' : ''}`}
      title={item.title}
      onClick={() => setActiveView(item.id)}
    >
      <i className={`codicon ${item.icon}`} />
    </div>
  )

  return (
    <div className="activitybar">
      <div className="activitybar__top">{topItems.map(renderItem)}</div>
      <div className="activitybar__bottom">{bottomItems.map(renderItem)}</div>
    </div>
  )
}
