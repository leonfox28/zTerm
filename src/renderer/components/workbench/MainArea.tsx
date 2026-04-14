import { useWorkbenchStore } from '../../stores/workbench.store'
import { SettingsView } from '../settings/SettingsView'
import { TerminalWorkspace } from './TerminalWorkspace'

export function MainArea() {
  const activeMainView = useWorkbenchStore((state) => state.activeMainView)

  return (
    <div className="main-area">
      <TerminalWorkspace visible={activeMainView === 'terminal'} />
      <SettingsView visible={activeMainView === 'settings'} />
    </div>
  )
}
