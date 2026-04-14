import { TitleBar } from './TitleBar'
import { ActivityBar } from './ActivityBar'
import { Sidebar } from './Sidebar'
import { Sash } from './Sash'
import { MainArea } from './MainArea'
import { AuxiliarySidebar } from './AuxiliarySidebar'
import { StatusBar } from './StatusBar'
import { ContextMenuHost } from '../context-menu/ContextMenuHost'
import { useWorkbenchStore } from '../../stores/workbench.store'
import '../../styles/workbench.css'

export function Workbench() {
  const { activeMainView, sidebarVisible, sidebarWidth } = useWorkbenchStore()
  const showTerminalChrome = activeMainView === 'terminal'

  const gridTemplateColumns = showTerminalChrome
    ? sidebarVisible
      ? `var(--activitybar-width) ${sidebarWidth}px 1fr var(--auxiliarybar-width)`
      : `var(--activitybar-width) 0px 1fr var(--auxiliarybar-width)`
    : `var(--activitybar-width) 0px 1fr 0px`

  return (
    <div className="workbench" style={{ gridTemplateColumns }}>
      <TitleBar />
      <ActivityBar />
      {showTerminalChrome && sidebarVisible && (
        <>
          <Sidebar />
          <Sash />
        </>
      )}
      <MainArea />
      {showTerminalChrome && <AuxiliarySidebar />}
      <StatusBar />
      <ContextMenuHost />
    </div>
  )
}
