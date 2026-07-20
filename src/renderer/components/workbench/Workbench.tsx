import { TitleBar } from './TitleBar'
import { ActivityBar } from './ActivityBar'
import { Sidebar } from './Sidebar'
import { Sash } from './Sash'
import { MainArea } from './MainArea'
import { StatusBar } from './StatusBar'
import { SshConnectionDialog } from '../connections/SshConnectionView'
import { useWorkbenchStore } from '../../stores/workbench.store'
import '../../styles/workbench.css'

export function Workbench() {
  const activeMainView = useWorkbenchStore((state) => state.activeMainView)
  const sidebarVisible = useWorkbenchStore((state) => state.sidebarVisible)
  const sidebarWidth = useWorkbenchStore((state) => state.sidebarWidth)
  const showSidebarChrome = activeMainView === 'terminal'

  const gridTemplateColumns = showSidebarChrome
    ? sidebarVisible
      ? `var(--activitybar-width) ${sidebarWidth}px 1fr`
      : `var(--activitybar-width) 0px 1fr`
    : `var(--activitybar-width) 0px 1fr`

  return (
    <div className="workbench" style={{ gridTemplateColumns }}>
      <TitleBar />
      <ActivityBar />
      {showSidebarChrome && sidebarVisible && (
        <>
          <Sidebar />
          <Sash />
        </>
      )}
      <MainArea />
      <StatusBar />
      <SshConnectionDialog />
    </div>
  )
}
