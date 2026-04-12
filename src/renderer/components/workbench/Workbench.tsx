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
  const { sidebarVisible, sidebarWidth } = useWorkbenchStore()

  const gridTemplateColumns = sidebarVisible
    ? `var(--activitybar-width) ${sidebarWidth}px 1fr var(--auxiliarybar-width)`
    : `var(--activitybar-width) 0px 1fr var(--auxiliarybar-width)`

  return (
    <div className="workbench" style={{ gridTemplateColumns }}>
      <TitleBar />
      <ActivityBar />
      {sidebarVisible && (
        <>
          <Sidebar />
          <Sash />
        </>
      )}
      <MainArea />
      <AuxiliarySidebar />
      <StatusBar />
      <ContextMenuHost />
    </div>
  )
}
