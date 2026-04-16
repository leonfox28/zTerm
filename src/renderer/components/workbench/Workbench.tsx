import { TitleBar } from './TitleBar'
import { ActivityBar } from './ActivityBar'
import { Sidebar } from './Sidebar'
import { Sash } from './Sash'
import { MainArea } from './MainArea'
import { AuxiliarySidebar } from './AuxiliarySidebar'
import { StatusBar } from './StatusBar'
import { SshConnectionDialog } from '../connections/SshConnectionView'
import { useWorkbenchStore } from '../../stores/workbench.store'
import '../../styles/workbench.css'

export function Workbench() {
  const { activeMainView, sidebarVisible, sidebarWidth, auxiliarySidebarWidth } = useWorkbenchStore()
  const showSidebarChrome = activeMainView === 'terminal'
  const showAuxiliaryChrome = activeMainView === 'terminal'

  const gridTemplateColumns = showSidebarChrome
    ? sidebarVisible
      ? `var(--activitybar-width) ${sidebarWidth}px 1fr ${showAuxiliaryChrome ? `${auxiliarySidebarWidth}px` : '0px'}`
      : `var(--activitybar-width) 0px 1fr ${showAuxiliaryChrome ? `${auxiliarySidebarWidth}px` : '0px'}`
    : `var(--activitybar-width) 0px 1fr 0px`

  return (
    <div className="workbench" style={{ gridTemplateColumns }}>
      <TitleBar />
      <ActivityBar />
      {showSidebarChrome && sidebarVisible && (
        <>
          <Sidebar />
          <Sash side="left" />
        </>
      )}
      <MainArea />
      {showAuxiliaryChrome && (
        <>
          <Sash side="right" />
          <AuxiliarySidebar />
        </>
      )}
      <StatusBar />
      <SshConnectionDialog />
    </div>
  )
}
